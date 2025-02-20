package videofiles

import (
	"context"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
)

type UseCase interface {
	GetPresignUrl(ctx context.Context, input *models.UploadInput) (string, error)
	CreateVideo(ctx context.Context, input *models.VideoUploadInput) (*models.VideoFile, error)
	//UploadVideo(ctx context.Context, input *models.VideoUploadInput) (*models.VideoFile, error)
	CreateJob(ctx context.Context, input *models.VideoUploadInput) (*models.EncodeJob, error)
	GetVideo(ctx context.Context, videoID uuid.UUID) (*models.VideoFile, error)
	ListVideos(ctx context.Context, pagination *utils.Pagination) (*models.VideoList, error)
	SearchVideos(ctx context.Context, query string, pagination *utils.Pagination) (*models.VideoList, error)
	DeleteVideo(ctx context.Context, videoID uuid.UUID) error

	UpdateVideo(ctx context.Context, video *models.VideoFile) error

	GetPlaybackInfo(ctx context.Context, videoID uuid.UUID) (*models.PlaybackInfo, error)
}
