package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/go-redis/redis/v8"
)

type videoRedisRepo struct {
	redisClient *redis.Client
}

func NewVideoRedisRepo(redisClient *redis.Client) videofiles.RedisRepository {
	return &videoRedisRepo{
		redisClient: redisClient,
	}
}

func (v *videoRedisRepo) EnqueueJob(ctx context.Context, key string, videoJob *models.EncodeJob) error {

	jobKey := fmt.Sprintf("job:%s", videoJob.JobID)
	jobJSON, err := json.Marshal(videoJob)
	if err != nil {
		return fmt.Errorf("failed to marshal job data: %w", err)
	}

	pipe := v.redisClient.Pipeline()

	pipe.HSet(ctx, jobKey, map[string]interface{}{
		"job_id":        videoJob.JobID,
		"user_id":       videoJob.UserID,
		"video_id":      videoJob.VideoID,
		"input_key":     videoJob.InputS3Key,
		"output_key":    videoJob.OutputS3Key,
		"status":        string(videoJob.Status),
		"started_at":    videoJob.StartedAt.Format(time.RFC3339),
		"input_bucket":  videoJob.InputBucket,
		"codec":         string(videoJob.Codec),
		"output_bucket": videoJob.OutputBucket,
	})

	pipe.Expire(ctx, jobKey, 24*time.Hour)

	pipe.LPush(ctx, key, string(jobJSON))

	notification := map[string]interface{}{
		"job_id":    videoJob.JobID,
		"video_id":  videoJob.VideoID,
		"timestamp": time.Now().Format(time.RFC3339),
	}
	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}
	pipe.Publish(ctx, "new_video_jobs_channel", notificationJSON)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to execute Redis pipeline: %w", err)
	}

	return nil
}

func (v *videoRedisRepo) GetJobDetails(ctx context.Context, jobID string) (*models.EncodeJob, error) {
	jobKey := fmt.Sprintf("job:%s", jobID)

	jobData, err := v.redisClient.HGetAll(ctx, jobKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get job details: %w", err)
	}
	if len(jobData) == 0 {
		return nil, fmt.Errorf("job not found")
	}

	startedAt, err := time.Parse(time.RFC3339, jobData["started_at"])
	if err != nil {
		return nil, fmt.Errorf("failed to parse started_at: %w", err)
	}

	job := &models.EncodeJob{
		JobID:        jobData["job_id"],
		UserID:       jobData["user_id"],
		VideoID:      jobData["video_id"],
		InputS3Key:   jobData["input_key"],
		OutputS3Key:  jobData["output_key"],
		Status:       models.JobStatus(jobData["status"]),
		Codec:        models.Codec(jobData["codec"]),
		StartedAt:    startedAt,
		InputBucket:  jobData["input_bucket"],
		OutputBucket: jobData["output_bucket"],
	}

	return job, nil
}

func (v *videoRedisRepo) UpdateProgress(ctx context.Context, jobID string, key string, progress float64) error {
	jobKey := fmt.Sprintf("job:%s", jobID)

	pipe := v.redisClient.Pipeline()
	pipe.HSet(ctx, jobKey, "progress", progress)

	notification := map[string]interface{}{
		"job_id":    jobID,
		"progress":  progress,
		"timestamp": time.Now().Format(time.RFC3339),
	}
	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal progress notification: %w", err)
	}
	pipe.Publish(ctx, "job_progress_channel", notificationJSON)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	return nil
}

func (v *videoRedisRepo) UpdateStatus(ctx context.Context, jobID string, key string, status models.JobStatus) error {
	jobKey := fmt.Sprintf("job:%s", jobID)

	pipe := v.redisClient.Pipeline()
	pipe.HSet(ctx, jobKey, "status", status)

	if status == models.JobStatusCompleted || status == models.JobStatusFailed {
		pipe.HSet(ctx, jobKey, "completed_at", time.Now().Format(time.RFC3339))
	}

	notification := map[string]interface{}{
		"job_id":    jobID,
		"status":    string(status),
		"timestamp": time.Now().Format(time.RFC3339),
	}
	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal status notification: %w", err)
	}
	pipe.Publish(ctx, "job_status_channel", notificationJSON)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	return nil
}

func (v *videoRedisRepo) GetJobStatus(ctx context.Context, key string, jobID string) (models.JobStatus, error) {
	jobKey := fmt.Sprintf("job:%s", jobID)
	status, err := v.redisClient.HGet(ctx, jobKey, "status").Result()
	if err != nil {
		return "", fmt.Errorf("failed to get job status: %w", err)
	}

	return models.JobStatus(status), nil
}

func (v *videoRedisRepo) DequeueJob(ctx context.Context, key string) (*models.EncodeJob, error) {

	res, err := v.redisClient.BLPop(ctx, time.Second, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to pop job from queue: %w", err)
	}

	job := &models.EncodeJob{}
	if err = json.Unmarshal([]byte(res[1]), job); err != nil {
		return nil, fmt.Errorf("error unmarshalling job: %v", err)
	}

	jobKey := fmt.Sprintf("job:%s", job.JobID)
	pipe := v.redisClient.Pipeline()

	pipe.HSet(ctx, jobKey, "status", string(models.JobStatusProcessing))
	pipe.HSet(ctx, jobKey, "started_at", time.Now().Format(time.RFC3339))

	notification := map[string]interface{}{
		"job_id":    job.JobID,
		"status":    string(models.JobStatusProcessing),
		"timestamp": time.Now().Format(time.RFC3339),
	}
	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal status notification: %w", err)
	}
	pipe.Publish(ctx, "job_status_channel", notificationJSON)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to update job status: %w", err)
	}

	return job, nil
}

func (v *videoRedisRepo) GetRedisClient() *redis.Client {
	return v.redisClient
}

func (v *videoRedisRepo) SubscribeToJobs(ctx context.Context, key string) *redis.PubSub {
	return v.redisClient.Subscribe(ctx, key)
}
