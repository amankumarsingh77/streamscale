package http

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/analytics"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/httpErrors"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// AnalyticsHandlers implements the analytics.Handlers interface
type AnalyticsHandlers struct {
	useCase analytics.UseCase
	logger  logger.Logger
}

// NewAnalyticsHandlers creates a new AnalyticsHandlers
func NewAnalyticsHandlers(useCase analytics.UseCase, logger logger.Logger) analytics.Handlers {
	return &AnalyticsHandlers{
		useCase: useCase,
		logger:  logger,
	}
}

// GetAnalyticsSummary godoc
// @Summary Get analytics summary for a user
// @Description Get analytics summary including total videos, views, watch time, and top videos
// @Tags analytics
// @Accept json
// @Produce json
// @Success 200 {object} models.AnalyticsSummary
// @Router /analytics/summary [get]
func (h *AnalyticsHandlers) GetAnalyticsSummary(c echo.Context) error {
	user, err := utils.GetUserFromCtx(c.Request().Context())
	if err != nil {
		return httpErrors.NewUnauthorizedError(err)
	}

	summary, err := h.useCase.GetAnalyticsSummary(c.Request().Context(), user.UserID)
	if err != nil {
		h.logger.Errorf("Error getting analytics summary: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, summary)
}

// RecordVideoView godoc
// @Summary Record a video view
// @Description Record a new view for a video
// @Tags analytics
// @Accept json
// @Produce json
// @Param input body models.VideoView true "Video view info"
// @Success 201 {object} models.VideoView
// @Router /analytics/views [post]
func (h *AnalyticsHandlers) RecordVideoView(c echo.Context) error {
	view := &models.VideoView{}
	if err := c.Bind(view); err != nil {
		return httpErrors.NewBadRequestError(err)
	}

	// Set user ID if authenticated
	user, err := utils.GetUserFromCtx(c.Request().Context())
	if err == nil {
		view.UserID = user.UserID
	}else {
		log.Printf("error getting user id : %v", err)
	}

	// Set IP address
	view.IP = c.RealIP()

	// Set user agent
	view.UserAgent = c.Request().UserAgent()

	if err := h.useCase.RecordVideoView(c.Request().Context(), view); err != nil {
		h.logger.Errorf("Error recording video view: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusCreated, view)
}

// GetVideoViews godoc
// @Summary Get video views
// @Description Get views for a specific video
// @Tags analytics
// @Accept json
// @Produce json
// @Param video_id path string true "Video ID"
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {array} models.VideoView
// @Router /analytics/videos/{video_id}/views [get]
func (h *AnalyticsHandlers) GetVideoViews(c echo.Context) error {
	videoIDStr := c.Param("video_id")
	videoID, err := uuid.Parse(videoIDStr)
	if err != nil {
		return httpErrors.NewBadRequestError(err)
	}

	// Parse filter parameters
	filter := &models.AnalyticsFilter{
		VideoID: videoID,
	}

	// Parse time range
	startDateStr := c.QueryParam("start_date")
	endDateStr := c.QueryParam("end_date")

	if startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		filter.TimeRange.StartDate = startDate
	}

	if endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		// Set to end of day
		endDate = endDate.Add(24*time.Hour - time.Second)
		filter.TimeRange.EndDate = endDate
	}

	// Parse pagination
	limitStr := c.QueryParam("limit")
	offsetStr := c.QueryParam("offset")

	if limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		filter.Limit = limit
	} else {
		filter.Limit = 50 // Default limit
	}

	if offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		filter.Offset = offset
	}

	views, err := h.useCase.GetVideoViews(c.Request().Context(), videoID, filter)
	if err != nil {
		h.logger.Errorf("Error getting video views: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, views)
}

// StartWatchSession godoc
// @Summary Start a watch session
// @Description Start a new watch session for a video
// @Tags analytics
// @Accept json
// @Produce json
// @Param input body models.VideoWatchSession true "Watch session info"
// @Success 201 {object} models.VideoWatchSession
// @Router /analytics/sessions/start [post]
func (h *AnalyticsHandlers) StartWatchSession(c echo.Context) error {
	session := &models.VideoWatchSession{}
	if err := c.Bind(session); err != nil {
		return httpErrors.NewBadRequestError(err)
	}

	// Set user ID if authenticated
	user, err := utils.GetUserFromCtx(c.Request().Context())
	if err == nil {
		session.UserID = user.UserID
	}

	// Generate session ID if not provided
	if session.SessionID == "" {
		session.SessionID = uuid.New().String()
	}

	result, err := h.useCase.StartWatchSession(
		c.Request().Context(),
		session.VideoID,
		session.UserID,
		session.SessionID,
	)
	if err != nil {
		h.logger.Errorf("Error starting watch session: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusCreated, result)
}

// EndWatchSession godoc
// @Summary End a watch session
// @Description End a watch session and record metrics
// @Tags analytics
// @Accept json
// @Produce json
// @Param input body models.VideoWatchSession true "Watch session info"
// @Success 200 {string} string "Session ended successfully"
// @Router /analytics/sessions/end [post]
func (h *AnalyticsHandlers) EndWatchSession(c echo.Context) error {
	session := &models.VideoWatchSession{}
	if err := c.Bind(session); err != nil {
		return httpErrors.NewBadRequestError(err)
	}

	if session.SessionID == "" {
		return httpErrors.NewBadRequestError(echo.NewHTTPError(http.StatusBadRequest, "Session ID is required"))
	}

	err := h.useCase.EndWatchSession(
		c.Request().Context(),
		session.SessionID,
		session.WatchDuration,
		session.Completed,
	)
	if err != nil {
		h.logger.Errorf("Error ending watch session: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Session ended successfully"})
}

// GetVideoPerformance godoc
// @Summary Get video performance metrics
// @Description Get performance metrics for a specific video
// @Tags analytics
// @Accept json
// @Produce json
// @Param video_id path string true "Video ID"
// @Success 200 {object} models.VideoPerformance
// @Router /analytics/videos/{video_id}/performance [get]
func (h *AnalyticsHandlers) GetVideoPerformance(c echo.Context) error {
	videoIDStr := c.Param("video_id")
	videoID, err := uuid.Parse(videoIDStr)
	if err != nil {
		return httpErrors.NewBadRequestError(err)
	}

	performance, err := h.useCase.GetVideoPerformance(c.Request().Context(), videoID)
	if err != nil {
		h.logger.Errorf("Error getting video performance: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, performance)
}

// GetTopPerformingVideos godoc
// @Summary Get top performing videos
// @Description Get top performing videos for the authenticated user
// @Tags analytics
// @Accept json
// @Produce json
// @Param limit query int false "Limit (default 10)"
// @Success 200 {array} models.VideoPerformance
// @Router /analytics/videos/top [get]
func (h *AnalyticsHandlers) GetTopPerformingVideos(c echo.Context) error {
	user, err := utils.GetUserFromCtx(c.Request().Context())
	if err != nil {
		return httpErrors.NewUnauthorizedError(err)
	}

	limitStr := c.QueryParam("limit")
	limit := 10 // Default limit
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		limit = parsedLimit
	}

	videos, err := h.useCase.GetTopPerformingVideos(c.Request().Context(), user.UserID, limit)
	if err != nil {
		h.logger.Errorf("Error getting top performing videos: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, videos)
}

// GetRecentVideos godoc
// @Summary Get recent videos
// @Description Get recent videos for the authenticated user
// @Tags analytics
// @Accept json
// @Produce json
// @Param limit query int false "Limit (default 10)"
// @Success 200 {array} models.VideoPerformance
// @Router /analytics/videos/recent [get]
func (h *AnalyticsHandlers) GetRecentVideos(c echo.Context) error {
	user, err := utils.GetUserFromCtx(c.Request().Context())
	if err != nil {
		return httpErrors.NewUnauthorizedError(err)
	}

	limitStr := c.QueryParam("limit")
	limit := 10 // Default limit
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil {
			return httpErrors.NewBadRequestError(err)
		}
		limit = parsedLimit
	}

	videos, err := h.useCase.GetRecentVideos(c.Request().Context(), user.UserID, limit)
	if err != nil {
		h.logger.Errorf("Error getting recent videos: %v", err)
		return httpErrors.NewInternalServerError(err)
	}

	return c.JSON(http.StatusOK, videos)
}

// Helper function to get user ID from context
func getUserIDFromContext(c echo.Context) (uuid.UUID, error) {
	user := c.Get("user")
	if user == nil {
		return uuid.Nil, echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// This depends on how your authentication middleware stores the user
	// Adjust according to your actual implementation
	userMap, ok := user.(map[string]interface{})
	if !ok {
		return uuid.Nil, echo.NewHTTPError(http.StatusInternalServerError, "Invalid user data")
	}

	userIDStr, ok := userMap["user_id"].(string)
	if !ok {
		return uuid.Nil, echo.NewHTTPError(http.StatusInternalServerError, "Invalid user ID")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, err
	}

	log.Println("userid ",userID)

	return userID, nil
}
