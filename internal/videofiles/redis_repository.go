package videofiles

import (
	"context"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/go-redis/redis/v8"
)

type RedisRepository interface {
	EnqueueJob(ctx context.Context, key string, videoJob *models.EncodeJob) error
	GetJobDetails(ctx context.Context, jobID string) (*models.EncodeJob, error)
	GetJobStatus(ctx context.Context, key string, jobID string) (models.JobStatus, error)
	UpdateProgress(ctx context.Context, jobID string, key string, progress float64) error
	UpdateStatus(ctx context.Context, jobID string, key string, status models.JobStatus) error
	SubscribeToJobs(ctx context.Context, key string) *redis.PubSub
	GetRedisClient() *redis.Client
	DequeueJob(ctx context.Context, key string) (*models.EncodeJob, error)
}
