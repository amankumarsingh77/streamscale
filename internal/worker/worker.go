package worker

import (
	"context"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
)

const (
	VideoJobsQueue  = VideoJobsQueueKey
	JobChannel      = "new_video_jobs_channel"
	DefaultCPULimit = 1.0
)

var ErrNoJob = errors.New("no job available")

func NewWorker(cfg *config.Config, logger logger.Logger, redisRepo videofiles.RedisRepository, awsRepo videofiles.AWSRepository, videoRepo videofiles.Repository) (*Worker, error) {
	if cfg == nil || logger == nil || redisRepo == nil || awsRepo == nil || videoRepo == nil {
		return nil, errors.New("missing required dependencies")
	}

	return &Worker{
		logger:    logger,
		redisRepo: redisRepo,
		awsRepo:   awsRepo,
		videoRepo: videoRepo,
		cfg:       cfg,
		stopChan:  make(chan struct{}),
		jobs:      make(chan *models.EncodeJob, 100),
		semaphore: make(chan struct{}, cfg.Worker.WorkerCount),
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Starting worker pool")
	log.Println(w.cfg.Worker.WorkerCount)

	w.wg.Add(1)
	go w.subscribeToJobs(ctx)

	for i := 0; i < w.cfg.Worker.WorkerCount; i++ {
		log.Println("Starting worker", i)
		w.wg.Add(1)
		go func(id int) {
			w.runWorker(ctx, id)
		}(i)
	}

	return nil
}

func (w *Worker) subscribeToJobs(ctx context.Context) {
	defer w.wg.Done()

	redisClient, ok := w.redisRepo.(interface{ GetRedisClient() *redis.Client })
	if !ok {
		w.logger.Error("Redis repository doesn't support getting client")
		return
	}
	client := redisClient.GetRedisClient()

	pubsub := client.Subscribe(ctx, JobChannel)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	if err != nil {
		w.logger.Errorf("Failed to subscribe to job channel: %v", err)
		return
	}

	w.logger.Info("Successfully subscribed to job notifications channel")
	ch := pubsub.Channel()

	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		w.dequeueJobs(ctx)
	}()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Job subscriber received context cancellation")
			return
		case <-w.stopChan:
			w.logger.Info("Job subscriber received stop signal")
			return
		case msg := <-ch:
			if msg != nil {
				w.logger.Infof("Received job notification: %s", msg.Payload)
			}
		}
	}
}

func (w *Worker) dequeueJobs(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopChan:
			return
		default:

			job, err := w.redisRepo.DequeueJob(ctx, VideoJobsQueueKey)

			if err != nil {
				if err != redis.Nil {

				}
				time.Sleep(1 * time.Second)
				continue
			}

			if job == nil {
				time.Sleep(1 * time.Second)
				continue
			}

			w.logger.Infof("Successfully dequeued job %s for video %s", job.JobID, job.VideoID)

			select {
			case w.jobs <- job:
				w.logger.Infof("Successfully queued job %s for processing", job.JobID)
			default:
				w.logger.Warnf("Job queue is full, waiting to queue job %s", job.JobID)

				for {
					select {
					case <-ctx.Done():
						return
					case <-w.stopChan:
						return
					case w.jobs <- job:
						w.logger.Infof("Successfully queued job %s after waiting", job.JobID)
						break
					case <-time.After(1 * time.Second):
						continue
					}
					break
				}
			}
		}
	}
}

func (w *Worker) Stop() {
	close(w.stopChan)
	w.wg.Wait()
	w.logger.Info("Worker stopped successfully")
}

func (w *Worker) runWorker(ctx context.Context, workerID int) {
	defer w.wg.Done()
	w.logger.Infof("Worker %d started", workerID)

	for {
		select {
		case <-ctx.Done():
			w.logger.Infof("Worker %d received shutdown signal", workerID)
			return
		case <-w.stopChan:
			w.logger.Infof("Worker %d received stop signal", workerID)
			return
		case job := <-w.jobs:

			select {
			case w.semaphore <- struct{}{}:

				go func() {
					defer func() { <-w.semaphore }()
					if err := w.processJob(ctx, workerID, job); err != nil {
						w.logger.Errorf("Worker %d failed to process job %s: %v", workerID, job.JobID, err)
					}
				}()
			default:

				select {
				case w.jobs <- job:
					w.logger.Infof("Worker %d: Requeued job %s due to full semaphore", workerID, job.JobID)
				default:
					w.logger.Warnf("Worker %d: Failed to requeue job %s, channel full", workerID, job.JobID)
				}
			}
		}
	}
}

func (w *Worker) processJob(ctx context.Context, workerID int, job *models.EncodeJob) error {
	w.logger.Infof("Worker %d processing job: %s", workerID, job.VideoID)

	videoID, err := uuid.Parse(job.VideoID)
	if err != nil {
		w.logger.Errorf("Failed to parse video ID: %v", err)
		return fmt.Errorf("invalid video ID: %w", err)
	}

	canAcceptJob, usage := utils.CheckCPUUsage(w.cfg.Worker.MaxCPUUsage)
	if !canAcceptJob {
		w.logger.Infof("Worker %d: CPU usage too high (%.2f%%), requeueing job", workerID, usage)
		select {
		case w.jobs <- job:
			return nil
		default:
			return fmt.Errorf("failed to requeue job, channel full")
		}
	}

	// Initial status - Processing with 0% progress
	if err := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 0); err != nil {
		w.logger.Errorf("Failed to update initial progress: %v", err)
	}

	if err := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "processing"); err != nil {
		w.logger.Errorf("Failed to update job status: %v", err)
	}

	processor := NewVideoProcessor(w.cfg, w.awsRepo, w.videoRepo, w.logger)
	result, err := processor.ProcessVideo(ctx, job.InputS3Key, job.OutputS3Key, videoID)
	if err != nil {
		if updateErr := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "failed"); updateErr != nil {
			w.logger.Errorf("Failed to update job status to failed: %v", updateErr)
		}
		// Set status to Failed with 0% progress
		if updateErr := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusFailed, 0); updateErr != nil {
			w.logger.Errorf("Failed to update progress on failure: %v", updateErr)
		}
		return fmt.Errorf("failed to process video: %w", err)
	}

	// Set status to Completed with 100% progress
	if err := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusCompleted, 100); err != nil {
		w.logger.Errorf("Failed to update final progress: %v", err)
	}

	playbackInfo := &models.PlaybackInfo{
		VideoID:   job.VideoID,
		Title:     filepath.Base(job.InputS3Key),
		Duration:  result.Duration,
		Thumbnail: fmt.Sprintf("%s/thumbnail.jpg", w.cfg.S3.CDNEndpoint),
		Qualities: make(map[models.VideoQuality]models.QualityInfo),
		Format:    models.FormatHLS,
		Status:    models.JobStatusCompleted,
	}

	// Strip any video file extension from the output path
	outputPath := job.OutputS3Key
	videoExtensions := []string{".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"}
	for _, ext := range videoExtensions {
		outputPath = strings.TrimSuffix(outputPath, ext)
	}

	for _, quality := range job.Qualities {
		qualityKey := models.VideoQuality(quality.Resolution)
		playbackInfo.Qualities[qualityKey] = models.QualityInfo{
			URLs: models.PlaybackURLs{
				HLS:  fmt.Sprintf("%s/%s/master.m3u8", w.cfg.S3.CDNEndpoint, outputPath),
				DASH: fmt.Sprintf("%s/%s/stream.mpd", w.cfg.S3.CDNEndpoint, outputPath),
			},
			Resolution: quality.Resolution,
			Bitrate:    quality.Bitrate,
		}
	}

	if err := w.videoRepo.CreatePlaybackInfo(ctx, videoID, playbackInfo); err != nil {
		w.logger.Errorf("Failed to create playback info: %v", err)
		return fmt.Errorf("failed to create playback info: %w", err)
	}

	if err := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "completed"); err != nil {
		w.logger.Errorf("Failed to update job status to completed: %v", err)
	}

	w.logger.Infof("Worker %d successfully processed job: %s", workerID, job.JobID)
	return nil
}
