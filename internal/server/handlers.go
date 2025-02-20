package server

import (
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
	"net/http"
)

func (s *Server) MapHandlers(e *echo.Echo) error {
	aRepo := authRepository.NewAuthRepo(s.db)
	nRepo := videoRepository.NewVideoRepo(s.db)
	vAWSRepo := videoRepository.NewAwsRepository(s.s3Client, s.preSignClient)
	vRedisRepo := videoRepository.NewVideoRedisRepo(s.redisClient)
	sRepo := sessionRepository.NewSessionRepository(s.redisClient, s.cfg)

	authUC := authUsecase.NewAuthUseCase(s.cfg, aRepo, s.logger)
	videoUC := videoUsecase.NewVideoUseCase(s.cfg, nRepo, vRedisRepo, vAWSRepo, s.logger)
	sessUC := usecase.NewSessionUseCase(sRepo, s.cfg)

	authHandlers := authHttp.NewAuthHandler(s.cfg, authUC, sessUC, s.logger)
	videoHandlers := videoHttp.NewVideoHandler(videoUC)

	mw := middleware.NewMiddlewareManager(authUC, s.cfg, []string{"*"}, sessUC, s.logger)

	v1 := e.Group("/api/v1")
	health := v1.Group("/health")
	authGroup := v1.Group("/auth")
	videoGroup := v1.Group("/video")

	authHttp.MapAuthRoutes(authGroup, authHandlers, mw, authUC, s.cfg)
	videoHttp.MapVideoRoutes(videoGroup, videoHandlers, mw)
	health.GET("", func(c echo.Context) error {
		s.logger.Infof("Health check RequestID: %s", utils.GetRequestID(c))
		return c.JSON(http.StatusOK, map[string]string{"status": "OK"})
	})
	return nil
}
