package http

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/analytics"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/middleware"
	"github.com/labstack/echo/v4"
)

// MapAnalyticsRoutes maps the analytics routes to the Echo instance
func MapAnalyticsRoutes(analyticsGroup *echo.Group, h analytics.Handlers, mw *middleware.MiddlewareManager) {
	// Analytics dashboard
	analyticsGroup.Use(mw.AuthSessionMiddleware)
	analyticsGroup.GET("/summary", h.GetAnalyticsSummary)
	
	// Video views
	analyticsGroup.POST("/views", h.RecordVideoView)
	analyticsGroup.GET("/videos/:video_id/views", h.GetVideoViews)
	
	// Watch sessions
	analyticsGroup.POST("/sessions/start", h.StartWatchSession)
	analyticsGroup.POST("/sessions/end", h.EndWatchSession)
	
	// Video performance
	analyticsGroup.GET("/videos/:video_id/performance", h.GetVideoPerformance)
	analyticsGroup.GET("/videos/top", h.GetTopPerformingVideos)
	analyticsGroup.GET("/videos/recent", h.GetRecentVideos)
}
