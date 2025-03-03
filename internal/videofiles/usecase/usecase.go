package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
)

type videoFileUC struct {
	cfg       *config.Config
	videoRepo videofiles.Repository
	redisRepo videofiles.RedisRepository
	awsRepo   videofiles.AWSRepository
	logger    logger.Logger
}

func NewVideoUseCase(
	cfg *config.Config,
	videoRepo videofiles.Repository,
	redisRepo videofiles.RedisRepository,
	awsRepo videofiles.AWSRepository,
	log logger.Logger,
) videofiles.UseCase {
	return &videoFileUC{
		cfg:       cfg,
		videoRepo: videoRepo,
		redisRepo: redisRepo,
		awsRepo:   awsRepo,
		logger:    log,
	}
}

func (v *videoFileUC) GetPresignUrl(ctx context.Context, input *models.UploadInput) (string, error) {
	if input == nil {
		return "", fmt.Errorf("invalid input: input is nil")
	}

	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetPresignUrl - GetUserFromCtx error: %v", err)
		return "", err
	}

	if err = utils.ValidateStruct(ctx, input); err != nil {
		v.logger.Errorf("GetPresignUrl - ValidateStruct error: %v", err)
		return "", err
	}

	input.BucketName = v.cfg.S3.InputBucket
	input.Key = fmt.Sprintf("uploads/%s/%s", user.UserID, input.Name)

	v.logger.Infof("Generating PresignedUrl for key: %s", input.Key)
	url, err := v.awsRepo.GetPresignedURL(ctx, input)
	if err != nil {
		v.logger.Errorf("GetPresignUrl - GetPresignedURL error: %v", err)
		return "", fmt.Errorf("failed to generate presigned URL: %v", err)
	}

	return url, nil
}

func (v *videoFileUC) CreateVideo(ctx context.Context, input *models.VideoUploadInput) (*models.VideoFile, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetUserFromCtx: %v", err)
		return nil, err
	}
	if err = utils.ValidateStruct(ctx, input); err != nil {
		v.logger.Errorf("UploadVideo - ValidateStruct error: %v", err)
		return nil, fmt.Errorf("invalid input: %v", err)
	}
	duration := &input.Duration
	videoFile := &models.VideoFile{
		UserID:   user.UserID,
		FileName: input.FileName,
		FileSize: input.FileSize,
		Duration: duration,
		S3Key:    fmt.Sprintf("uploads/%s/%s", user.UserID, input.FileName),
		Status:   models.JobStatusQueued,
		S3Bucket: v.cfg.S3.InputBucket,
		Format:   input.Format,
	}
	videoFile, err = v.videoRepo.CreateVideo(ctx, videoFile)
	if err != nil {
		v.logger.Errorf("UploadVideo - CreateVideo error: %v", err)
		return nil, err
	}
	return videoFile, nil
}

func (v *videoFileUC) CreateJob(ctx context.Context, input *models.VideoUploadInput) (*models.EncodeJob, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetUserFromCtx: %v", err)
		return nil, err
	}
	log.Println("input", input)
	if err = utils.ValidateStruct(ctx, input); err != nil {
		v.logger.Errorf("UploadVideo - ValidateStruct error: %v", err)
		return nil, fmt.Errorf("invalid input: %v", err)
	}
	if len(input.Qualities) == 0 {
		input.Qualities = utils.GetDefaultQualities()
	} else {
		for i, quality := range input.Qualities {
			if quality.MaxBitrate <= 0 {
				quality.MaxBitrate = utils.GetDefaultMaxBitrate(quality.Resolution)
			}
			if quality.MinBitrate <= 0 {
				quality.MinBitrate = utils.GetDefaultMinBitrate(quality.Resolution)
			}
			if quality.Bitrate < quality.MinBitrate || quality.Bitrate > quality.MaxBitrate {
				input.Qualities[i].Bitrate = utils.AdjustBitrateToRange(
					quality.Bitrate,
					quality.MinBitrate,
					quality.MaxBitrate,
				)
			}
		}
	}
	if len(input.OutputFormats) == 0 {
		input.OutputFormats = []models.PlaybackFormat{
			models.FormatHLS,
		}
	}
	if input.Codec == "" {
		input.Codec = models.CodecH264
	}

	videoFile := &models.VideoFile{
		UserID:   user.UserID,
		FileName: input.FileName,
		FileSize: input.FileSize,
		Duration: &input.Duration,
		Progress: 0,
		S3Key:    fmt.Sprintf("uploads/%s/%s", user.UserID, input.FileName),
		Status:   models.JobStatusQueued,
		S3Bucket: v.cfg.S3.InputBucket,
		Format:   input.Format,
	}
	videoFile, err = v.videoRepo.CreateVideo(ctx, videoFile)
	if err != nil {
		v.logger.Errorf("UploadVideo - CreateVideo error: %v", err)
		return nil, err
	}
	job := &models.EncodeJob{
		JobID:                  uuid.New().String(),
		UserID:                 user.UserID.String(),
		VideoID:                videoFile.VideoID.String(),
		InputS3Key:             videoFile.S3Key,
		InputBucket:            videoFile.S3Bucket,
		OutputBucket:           v.cfg.S3.OutputBucket,
		OutputS3Key:            fmt.Sprintf("uploads/%s/%s", user.UserID, input.FileName),
		Progress:               0,
		Qualities:              input.Qualities,
		OutputFormats:          input.OutputFormats,
		EnablePerTitleEncoding: input.EnablePerTitleEncoding,
		Status:                 videoFile.Status,
		Codec:                  input.Codec,
		StartedAt:              time.Now(),
	}
	if err = v.redisRepo.EnqueueJob(ctx, v.cfg.Redis.JobQueueKey, job); err != nil {
		v.logger.Errorf("UploadVideo - EnqueueJob error: %v", err)
		return nil, fmt.Errorf("failed to queue the job :%v", err)
	}
	return job, nil
}

func (v *videoFileUC) GetVideo(ctx context.Context, videoID uuid.UUID) (*models.VideoFile, error) {
	if videoID == uuid.Nil {
		return nil, fmt.Errorf("invalid video id: cannot be empty")
	}
	v.logger.Infof("Fetching video with ID: %s", videoID.String())

	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return nil, fmt.Errorf("unauthorized: %v", err)
	}

	video, err := v.videoRepo.GetVideoByID(ctx, videoID)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			v.logger.Warnf("Video not found with ID: %s", videoID.String())
			return nil, fmt.Errorf("video not found")
		}
		v.logger.Errorf("GetVideo - failed to fetch video: %v", err)
		return nil, fmt.Errorf("failed to fetch video: %v", err)
	}

	if video.UserID != user.UserID {
		v.logger.Warnf("User %s is not authorized to access video %s", user.UserID, videoID.String())
		return nil, fmt.Errorf("unauthorized access to video")
	}

	return video, nil
}

func (v *videoFileUC) ListVideos(ctx context.Context, pagination *utils.Pagination) (*models.VideoList, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return nil, err
	}

	if pagination == nil {
		pagination = &utils.Pagination{
			Page: 1,
			Size: 10,
		}
	}
	if pagination.Page < 1 {
		pagination.Page = 1
	}
	if pagination.Size < 1 || pagination.Size > 100 {
		pagination.Size = 10
	}
	v.logger.Infof("Listing videos for user: %s, page: %d, size: %d",
		user.UserID.String(),
		pagination.Page,
		pagination.Size,
	)

	videos, err := v.videoRepo.GetVideos(ctx, user.UserID, pagination)
	if err != nil {
		v.logger.Errorf("ListVideos - failed to fetch videos for user %s: %v",
			user.UserID.String(),
			err,
		)
		return nil, fmt.Errorf("failed to fetch videos: %v", err)
	}
	v.logger.Infof("Successfully fetched %d videos for user %s (total: %d, page: %d/%d)",
		len(videos.Videos),
		user.UserID.String(),
		videos.TotalCount,
		videos.Page,
		utils.GetTotalPages(videos.TotalCount, pagination.Size),
	)
	return videos, nil
}

func (v *videoFileUC) SearchVideos(ctx context.Context, query string, pagination *utils.Pagination) (*models.VideoList, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return nil, err
	}
	if query == "" {
		return nil, fmt.Errorf("invalid query: cannot be empty")
	}
	if pagination == nil {
		pagination = &utils.Pagination{
			Page: 1,
			Size: 10,
		}
	}
	if pagination.Page < 1 {
		pagination.Page = 1
	}
	if pagination.Size < 1 || pagination.Size > 100 {
		pagination.Size = 10
	}
	videos, err := v.videoRepo.GetVideosByQuery(ctx, user.UserID, query, pagination)
	if err != nil {
		v.logger.Errorf("SearchVideos - failed to search videos: %v", err)
		return nil, fmt.Errorf("failed to search videos: %v", err)
	}
	return videos, nil
}

func (v *videoFileUC) DeleteVideo(ctx context.Context, videoID uuid.UUID) error {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return err
	}
	if videoID == uuid.Nil {
		return fmt.Errorf("invalid video id: cannot be empty")
	}
	if err = v.videoRepo.DeleteVideo(ctx, user.UserID, videoID); err != nil {
		v.logger.Errorf("DeleteVideo - failed to delete video: %v", err)
		return fmt.Errorf("failed to delete video: %v", err)
	}
	return nil
}

func (v *videoFileUC) UpdateVideo(ctx context.Context, video *models.VideoFile) error {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return err
	}
	if video.UserID != user.UserID {
		v.logger.Warnf("User %s is not authorized to update video %s", user.UserID, video.VideoID.String())
		return fmt.Errorf("unauthorized access to video")
	}
	if _, err = v.videoRepo.UpdateVideo(ctx, video); err != nil {
		v.logger.Errorf("UpdateVideo - failed to update video: %v", err)
		return fmt.Errorf("failed to update video: %v", err)
	}
	return nil
}

func (v *videoFileUC) GetPlaybackInfo(ctx context.Context, videoID uuid.UUID) (*models.PlaybackInfo, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		v.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return nil, fmt.Errorf("GetVideo - failed to get user from context:  %v", err)
	}
	video, err := v.videoRepo.GetVideoByID(ctx, videoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			v.logger.Warnf("Video not found with ID: %s", videoID.String())
			return nil, fmt.Errorf("video not found")
		}
		v.logger.Errorf("GetPlaybackInfo - failed to fetch video: %v", err)
		return nil, fmt.Errorf("failed to fetch video: %v", err)
	}
	if video.UserID != user.UserID {
		v.logger.Warnf("User %s is not authorized to access video %s", user.UserID, videoID.String())
		return nil, fmt.Errorf("unauthorized access to video")
	}
	playbackInfo, err := v.videoRepo.GetPlaybackInfo(ctx, videoID)
	if err != nil {
		v.logger.Errorf("GetPlaybackInfo - failed to fetch playback info: %v", err)
		return nil, fmt.Errorf("failed to fetch playback info: %v", err)
	}
	return playbackInfo, nil
}
