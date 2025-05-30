package analytics

import (
	"context"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/google/uuid"
)

// UseCase defines the interface for analytics business logic
type UseCase interface {
	// Video views
	RecordVideoView(ctx context.Context, view *models.VideoView) error
	GetVideoViews(ctx context.Context, videoID uuid.UUID, filter *models.AnalyticsFilter) ([]*models.VideoView, error)
	
	// Watch sessions
	StartWatchSession(ctx context.Context, videoID, userID uuid.UUID, sessionID string) (*models.VideoWatchSession, error)
	EndWatchSession(ctx context.Context, sessionID string, watchDuration int64, completed bool) error
	
	// Engagement metrics
	CalculateEngagement(ctx context.Context, videoID uuid.UUID) (*models.VideoEngagement, error)
	GetVideoEngagement(ctx context.Context, videoID uuid.UUID) (*models.VideoEngagement, error)
	
	// Performance metrics
	GetVideoPerformance(ctx context.Context, videoID uuid.UUID) (*models.VideoPerformance, error)
	GetTopPerformingVideos(ctx context.Context, userID uuid.UUID, limit int) ([]*models.VideoPerformance, error)
	GetRecentVideos(ctx context.Context, userID uuid.UUID, limit int) ([]*models.VideoPerformance, error)
	
	// Summary metrics
	GetAnalyticsSummary(ctx context.Context, userID uuid.UUID) (*models.AnalyticsSummary, error)
	GetTotalVideos(ctx context.Context, userID uuid.UUID) (int64, error)
	GetTotalWatchTime(ctx context.Context, userID uuid.UUID) (int64, error)
}
