package analytics

import "github.com/labstack/echo/v4"

// Handlers defines the interface for analytics HTTP handlers
type Handlers interface {
	// Analytics dashboard
	GetAnalyticsSummary(c echo.Context) error
	
	// Video views
	RecordVideoView(c echo.Context) error
	GetVideoViews(c echo.Context) error
	
	// Watch sessions
	StartWatchSession(c echo.Context) error
	EndWatchSession(c echo.Context) error
	
	// Video performance
	GetVideoPerformance(c echo.Context) error
	GetTopPerformingVideos(c echo.Context) error
	GetRecentVideos(c echo.Context) error
}
