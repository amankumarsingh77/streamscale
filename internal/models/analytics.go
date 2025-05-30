package models

import (
	"time"

	"github.com/google/uuid"
)

// VideoView represents a single view of a video
type VideoView struct {
	ID        int64     `json:"id" db:"id"`
	VideoID   uuid.UUID `json:"video_id" db:"video_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	IP        string    `json:"ip" db:"ip"`
	UserAgent string    `json:"user_agent" db:"user_agent"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	Duration  int64     `json:"duration" db:"duration"` // Duration watched in seconds
}

// VideoWatchSession represents a viewing session of a video
type VideoWatchSession struct {
	ID            int64     `json:"id" db:"id"`
	VideoID       uuid.UUID `json:"video_id" db:"video_id"`
	UserID        uuid.UUID `json:"user_id" db:"user_id"`
	SessionID     string    `json:"session_id" db:"session_id"`
	StartTime     time.Time `json:"start_time" db:"start_time"`
	EndTime       time.Time `json:"end_time" db:"end_time"`
	WatchDuration int64     `json:"watch_duration" db:"watch_duration"` // Duration watched in seconds
	Completed     bool      `json:"completed" db:"completed"`           // Whether the video was watched to completion
}

// VideoEngagement represents engagement metrics for a video
type VideoEngagement struct {
	VideoID          uuid.UUID `json:"video_id" db:"video_id"`
	TotalViews       int64     `json:"total_views" db:"total_views"`
	UniqueViews      int64     `json:"unique_views" db:"unique_views"`
	TotalWatchTime   int64     `json:"total_watch_time" db:"total_watch_time"` // Total watch time in seconds
	AvgWatchTime     float64   `json:"avg_watch_time" db:"avg_watch_time"`     // Average watch time in seconds
	CompletionRate   float64   `json:"completion_rate" db:"completion_rate"`   // Percentage of views that completed the video
	EngagementScore  float64   `json:"engagement_score" db:"engagement_score"` // Calculated engagement score
	LastCalculatedAt time.Time `json:"last_calculated_at" db:"last_calculated_at"`
}

// VideoPerformance represents performance metrics for a video
type VideoPerformance struct {
	VideoID           uuid.UUID `json:"video_id" db:"video_id"`
	Title             string    `json:"title" db:"title"`
	Duration          float64   `json:"duration" db:"duration"`  // Changed from int64 to float64 to match database schema
	TotalViews        int64     `json:"total_views" db:"total_views"`
	UniqueViews       int64     `json:"unique_views" db:"unique_views"`
	TotalWatchTime    int64     `json:"total_watch_time" db:"total_watch_time"`
	AvgWatchTime      float64   `json:"avg_watch_time" db:"avg_watch_time"`
	CompletionRate    float64   `json:"completion_rate" db:"completion_rate"`
	EngagementScore   float64   `json:"engagement_score" db:"engagement_score"`
	ViewsLast7Days    int64     `json:"views_last_7_days" db:"views_last_7_days"`
	ViewsLast30Days   int64     `json:"views_last_30_days" db:"views_last_30_days"`
	WatchTimeLast7Days  int64   `json:"watch_time_last_7_days" db:"watch_time_last_7_days"`
	WatchTimeLast30Days int64   `json:"watch_time_last_30_days" db:"watch_time_last_30_days"`
	ThumbnailURL      string    `json:"thumbnail_url" db:"thumbnail_url"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

// AnalyticsSummary represents a summary of analytics for a user
type AnalyticsSummary struct {
	TotalVideos       int64     `json:"total_videos"`
	TotalViews        int64     `json:"total_views"`
	TotalWatchTime    int64     `json:"total_watch_time"` // In seconds
	AvgEngagementScore float64  `json:"avg_engagement_score"`
	RecentVideos      []*VideoPerformance `json:"recent_videos"`
	TopVideos         []*VideoPerformance `json:"top_videos"`
}

// AnalyticsTimeRange represents a time range for analytics queries
type AnalyticsTimeRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

// AnalyticsFilter represents filter options for analytics queries
type AnalyticsFilter struct {
	UserID    uuid.UUID        `json:"user_id"`
	VideoID   uuid.UUID        `json:"video_id"`
	TimeRange AnalyticsTimeRange `json:"time_range"`
	Limit     int              `json:"limit"`
	Offset    int              `json:"offset"`
}
