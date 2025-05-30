package analytics

import (
	"context"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/google/uuid"
)

// Repository defines the interface for analytics data storage
type Repository interface {
	// Video views
	CreateVideoView(ctx context.Context, view *models.VideoView) error
	GetVideoViews(ctx context.Context, videoID uuid.UUID, filter *models.AnalyticsFilter) ([]*models.VideoView, error)
	GetTotalVideoViews(ctx context.Context, videoID uuid.UUID) (int64, error)
	GetUniqueVideoViews(ctx context.Context, videoID uuid.UUID) (int64, error)
	
	// Watch sessions
	CreateWatchSession(ctx context.Context, session *models.VideoWatchSession) error
	UpdateWatchSession(ctx context.Context, session *models.VideoWatchSession) error
	GetWatchSessions(ctx context.Context, videoID uuid.UUID, filter *models.AnalyticsFilter) ([]*models.VideoWatchSession, error)
	
	// Engagement metrics
	UpdateVideoEngagement(ctx context.Context, engagement *models.VideoEngagement) error
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
