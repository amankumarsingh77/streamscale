package videofiles

import (
	"context"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
)

type Repository interface {
	CreateVideo(ctx context.Context, videoFile *models.VideoFile) (*models.VideoFile, error)
	GetVideos(ctx context.Context, userID uuid.UUID, pq *utils.Pagination) (*models.VideoList, error)
	GetVideoByID(ctx context.Context, videoID uuid.UUID) (*models.VideoFile, error)
	UpdateVideo(ctx context.Context, video *models.VideoFile) (*models.VideoFile, error)
	GetVideosByQuery(ctx context.Context, userID uuid.UUID, query string, pq *utils.Pagination) (*models.VideoList, error)
	DeleteVideo(ctx context.Context, userID uuid.UUID, videoID uuid.UUID) error
	GetPlaybackInfo(ctx context.Context, videoID uuid.UUID) (*models.PlaybackInfo, error)
	CreatePlaybackInfo(ctx context.Context, videoID uuid.UUID, info *models.PlaybackInfo) error
	UpdateVideoProgress(ctx context.Context, videoID uuid.UUID, status models.JobStatus, progress float64) error
}
