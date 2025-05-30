package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/analytics"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// PostgresRepository implements the analytics.Repository interface
type PostgresRepository struct {
	db     *sqlx.DB
	logger logger.Logger
}

// NewPostgresRepository creates a new PostgresRepository
func NewPostgresRepository(db *sqlx.DB, logger logger.Logger) analytics.Repository {
	return &PostgresRepository{
		db:     db,
		logger: logger,
	}
}

// CreateVideoView records a new video view
func (r *PostgresRepository) CreateVideoView(ctx context.Context, view *models.VideoView) error {
	query := `
		INSERT INTO video_views (video_id, user_id, ip, user_agent, timestamp, duration)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		view.VideoID,
		view.UserID,
		view.IP,
		view.UserAgent,
		view.Timestamp,
		view.Duration,
	).Scan(&view.ID)

	if err != nil {
		r.logger.Errorf("Error creating video view: %v", err)
		return err
	}

	return nil
}

// GetVideoViews retrieves video views based on filter
func (r *PostgresRepository) GetVideoViews(ctx context.Context, videoID uuid.UUID, filter *models.AnalyticsFilter) ([]*models.VideoView, error) {
	query := `
		SELECT id, video_id, user_id, ip, user_agent, timestamp, duration
		FROM video_views
		WHERE video_id = $1
	`

	args := []interface{}{videoID}
	argCount := 2

	if !filter.TimeRange.StartDate.IsZero() {
		query += " AND timestamp >= $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.TimeRange.StartDate)
		argCount++
	}

	if !filter.TimeRange.EndDate.IsZero() {
		query += " AND timestamp <= $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.TimeRange.EndDate)
		argCount++
	}

	query += " ORDER BY timestamp DESC"

	if filter.Limit > 0 {
		query += " LIMIT $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Limit)
		argCount++
	}

	if filter.Offset > 0 {
		query += " OFFSET $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Offset)
	}

	var views []*models.VideoView
	err := r.db.SelectContext(ctx, &views, query, args...)
	if err != nil {
		r.logger.Errorf("Error getting video views: %v", err)
		return nil, err
	}

	return views, nil
}

// GetTotalVideoViews gets the total number of views for a video
func (r *PostgresRepository) GetTotalVideoViews(ctx context.Context, videoID uuid.UUID) (int64, error) {
	query := `
		SELECT COUNT(*)
		FROM video_views
		WHERE video_id = $1
	`

	var count int64
	err := r.db.GetContext(ctx, &count, query, videoID)
	if err != nil {
		r.logger.Errorf("Error getting total video views: %v", err)
		return 0, err
	}

	return count, nil
}

// GetUniqueVideoViews gets the number of unique viewers for a video
func (r *PostgresRepository) GetUniqueVideoViews(ctx context.Context, videoID uuid.UUID) (int64, error) {
	query := `
		SELECT COUNT(DISTINCT user_id)
		FROM video_views
		WHERE video_id = $1 AND user_id IS NOT NULL
	`

	var count int64
	err := r.db.GetContext(ctx, &count, query, videoID)
	if err != nil {
		r.logger.Errorf("Error getting unique video views: %v", err)
		return 0, err
	}

	return count, nil
}

// CreateWatchSession creates a new watch session
func (r *PostgresRepository) CreateWatchSession(ctx context.Context, session *models.VideoWatchSession) error {
	query := `
		INSERT INTO video_watch_sessions (video_id, user_id, session_id, start_time, end_time, watch_duration, completed)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		session.VideoID,
		session.UserID,
		session.SessionID,
		session.StartTime,
		session.EndTime,
		session.WatchDuration,
		session.Completed,
	).Scan(&session.ID)

	if err != nil {
		r.logger.Errorf("Error creating watch session: %v", err)
		return err
	}

	return nil
}

// UpdateWatchSession updates an existing watch session
func (r *PostgresRepository) UpdateWatchSession(ctx context.Context, session *models.VideoWatchSession) error {
	query := `
		UPDATE video_watch_sessions
		SET end_time = $1, watch_duration = $2, completed = $3
		WHERE session_id = $4
	`

	_, err := r.db.ExecContext(
		ctx,
		query,
		session.EndTime,
		session.WatchDuration,
		session.Completed,
		session.SessionID,
	)

	if err != nil {
		r.logger.Errorf("Error updating watch session: %v", err)
		return err
	}

	return nil
}

// GetWatchSessions retrieves watch sessions based on filter
func (r *PostgresRepository) GetWatchSessions(ctx context.Context, videoID uuid.UUID, filter *models.AnalyticsFilter) ([]*models.VideoWatchSession, error) {
	query := `
		SELECT id, video_id, user_id, session_id, start_time, end_time, watch_duration, completed
		FROM video_watch_sessions
		WHERE video_id = $1
	`

	args := []interface{}{videoID}
	argCount := 2

	if !filter.TimeRange.StartDate.IsZero() {
		query += " AND start_time >= $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.TimeRange.StartDate)
		argCount++
	}

	if !filter.TimeRange.EndDate.IsZero() {
		query += " AND start_time <= $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.TimeRange.EndDate)
		argCount++
	}

	query += " ORDER BY start_time DESC"

	if filter.Limit > 0 {
		query += " LIMIT $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Limit)
		argCount++
	}

	if filter.Offset > 0 {
		query += " OFFSET $" + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Offset)
	}

	var sessions []*models.VideoWatchSession
	err := r.db.SelectContext(ctx, &sessions, query, args...)
	if err != nil {
		r.logger.Errorf("Error getting watch sessions: %v", err)
		return nil, err
	}

	return sessions, nil
}

// UpdateVideoEngagement updates or creates video engagement metrics
func (r *PostgresRepository) UpdateVideoEngagement(ctx context.Context, engagement *models.VideoEngagement) error {
	_, err := r.db.ExecContext(
		ctx,
		updateVideoEngagementQuery,
		engagement.VideoID,
		engagement.TotalViews,
		engagement.UniqueViews,
		engagement.TotalWatchTime,
		engagement.AvgWatchTime,
		engagement.CompletionRate,
		engagement.EngagementScore,
		time.Now(),
	)

	if err != nil {
		r.logger.Errorf("Error updating video engagement: %v", err)
		return err
	}

	return nil
}

// GetVideoEngagement retrieves engagement metrics for a video
func (r *PostgresRepository) GetVideoEngagement(ctx context.Context, videoID uuid.UUID) (*models.VideoEngagement, error) {
	engagement := &models.VideoEngagement{}
	err := r.db.GetContext(ctx, engagement, getVideoEngagementQuery, videoID)
	if err != nil {
		r.logger.Errorf("Error getting video engagement: %v", err)
		return nil, err
	}

	return engagement, nil
}

// GetVideoPerformance retrieves performance metrics for a video
func (r *PostgresRepository) GetVideoPerformance(ctx context.Context, videoID uuid.UUID) (*models.VideoPerformance, error) {
	performance := &models.VideoPerformance{}
	err := r.db.GetContext(ctx, performance, getVideoPerformanceQuery, videoID)
	if err != nil {
		r.logger.Errorf("Error getting video performance: %v", err)
		return nil, err
	}

	return performance, nil
}

// GetTopPerformingVideos retrieves top performing videos for a user
func (r *PostgresRepository) GetTopPerformingVideos(ctx context.Context, userID uuid.UUID, limit int) ([]*models.VideoPerformance, error) {
	var videos []*models.VideoPerformance
	err := r.db.SelectContext(ctx, &videos, getTopPerformingVideosQuery, userID, limit)
	if err != nil {
		r.logger.Errorf("Error getting top performing videos: %v", err)
		return nil, err
	}

	return videos, nil
}

// GetRecentVideos retrieves recent videos for a user
func (r *PostgresRepository) GetRecentVideos(ctx context.Context, userID uuid.UUID, limit int) ([]*models.VideoPerformance, error) {
	var videos []*models.VideoPerformance
	err := r.db.SelectContext(ctx, &videos, getRecentVideosQuery, userID, limit)
	if err != nil {
		r.logger.Errorf("Error getting recent videos: %v", err)
		return nil, err
	}

	return videos, nil
}

// GetAnalyticsSummary retrieves analytics summary for a user
func (r *PostgresRepository) GetAnalyticsSummary(ctx context.Context, userID uuid.UUID) (*models.AnalyticsSummary, error) {
	summary := &models.AnalyticsSummary{}

	// Get total videos
	totalVideos, err := r.GetTotalVideos(ctx, userID)
	if err != nil {
		return nil, err
	}
	summary.TotalVideos = totalVideos

	// Get total watch time
	totalWatchTime, err := r.GetTotalWatchTime(ctx, userID)
	if err != nil {
		return nil, err
	}
	summary.TotalWatchTime = totalWatchTime

	// Get total views
	query := `
		SELECT COALESCE(SUM(e.total_views), 0)
		FROM video_engagement e
		JOIN video_files v ON e.video_id = v.video_id
		WHERE v.user_id = $1
	`
	err = r.db.GetContext(ctx, &summary.TotalViews, query, userID)
	if err != nil {
		r.logger.Errorf("Error getting total views: %v", err)
		return nil, err
	}

	// Get average engagement score
	query = `
		SELECT COALESCE(AVG(e.engagement_score), 0)
		FROM video_engagement e
		JOIN video_files v ON e.video_id = v.video_id
		WHERE v.user_id = $1
	`
	err = r.db.GetContext(ctx, &summary.AvgEngagementScore, query, userID)
	if err != nil {
		r.logger.Errorf("Error getting average engagement score: %v", err)
		return nil, err
	}

	// Get recent videos
	recentVideos, err := r.GetRecentVideos(ctx, userID, 5)
	if err != nil {
		return nil, err
	}
	summary.RecentVideos = recentVideos

	// Get top videos
	topVideos, err := r.GetTopPerformingVideos(ctx, userID, 5)
	if err != nil {
		return nil, err
	}
	summary.TopVideos = topVideos

	return summary, nil
}

// GetTotalVideos gets the total number of videos for a user
func (r *PostgresRepository) GetTotalVideos(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.GetContext(ctx, &count, getTotalVideosQuery, userID)
	if err != nil {
		r.logger.Errorf("Error getting total videos: %v", err)
		return 0, err
	}

	return count, nil
}

// GetTotalWatchTime gets the total watch time for a user's videos
func (r *PostgresRepository) GetTotalWatchTime(ctx context.Context, userID uuid.UUID) (int64, error) {
	var totalWatchTime int64
	err := r.db.GetContext(ctx, &totalWatchTime, getTotalWatchTimeQuery, userID)
	if err != nil {
		r.logger.Errorf("Error getting total watch time: %v", err)
		return 0, err
	}

	return totalWatchTime, nil
}
