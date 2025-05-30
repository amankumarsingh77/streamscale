package server

import (
	"net/http"

	analyticsHttp "github.com/amankumarsingh77/cloud-video-encoder/internal/analytics/delivery/http"
	analyticsRepository "github.com/amankumarsingh77/cloud-video-encoder/internal/analytics/repository"
	analyticsUsecase "github.com/amankumarsingh77/cloud-video-encoder/internal/analytics/usecase"
	authHttp "github.com/amankumarsingh77/cloud-video-encoder/internal/auth/delivery/http"
	authRepository "github.com/amankumarsingh77/cloud-video-encoder/internal/auth/repository"
	authUsecase "github.com/amankumarsingh77/cloud-video-encoder/internal/auth/usecase"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/middleware"
	sessionRepository "github.com/amankumarsingh77/cloud-video-encoder/internal/session/repository"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/session/usecase"
	videoHttp "github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles/delivery/http"
	videoRepository "github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles/repository"
	videoUsecase "github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles/usecase"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/labstack/echo/v4"
)

func (s *Server) MapHandlers(e *echo.Echo) error {
	// Repositories
	aRepo := authRepository.NewAuthRepo(s.db)
	nRepo := videoRepository.NewVideoRepo(s.db)
	vAWSRepo := videoRepository.NewAwsRepository(s.s3Client, s.preSignClient)
	vRedisRepo := videoRepository.NewVideoRedisRepo(s.redisClient)
	sRepo := sessionRepository.NewSessionRepository(s.redisClient, s.cfg)
	analyticsRepo := analyticsRepository.NewPostgresRepository(s.db, s.logger)

	// Use cases
	authUC := authUsecase.NewAuthUseCase(s.cfg, aRepo, s.logger)
	videoUC := videoUsecase.NewVideoUseCase(s.cfg, nRepo, vRedisRepo, vAWSRepo, s.logger)
	sessUC := usecase.NewSessionUseCase(sRepo, s.cfg)
	analyticsUC := analyticsUsecase.NewAnalyticsUseCase(analyticsRepo, s.logger)

	// Handlers
	authHandlers := authHttp.NewAuthHandler(s.cfg, authUC, sessUC, s.logger)
	videoHandlers := videoHttp.NewVideoHandler(videoUC)
	analyticsHandlers := analyticsHttp.NewAnalyticsHandlers(analyticsUC, s.logger)

	// Middleware
	mw := middleware.NewMiddlewareManager(authUC, s.cfg, []string{"*"}, sessUC, s.logger)

	// API groups
	v1 := e.Group("/api/v1")
	health := v1.Group("/health")
	authGroup := v1.Group("/auth")
	videoGroup := v1.Group("/video")
	analyticsGroup := v1.Group("/analytics")

	// Map routes
	authHttp.MapAuthRoutes(authGroup, authHandlers, mw, authUC, s.cfg)
	videoHttp.MapVideoRoutes(videoGroup, videoHandlers, mw)
	analyticsHttp.MapAnalyticsRoutes(analyticsGroup, analyticsHandlers, mw)

	health.GET("", func(c echo.Context) error {
		s.logger.Infof("Health check RequestID: %s", utils.GetRequestID(c))
		return c.JSON(http.StatusOK, map[string]string{"status": "OK"})
	})

	return nil
}
