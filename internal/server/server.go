package server

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-redis/redis/v8"
	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

const (
	maxHeaderBytes = 1 << 20
	ctxTimeout     = 5
)

type Server struct {
	echo          *echo.Echo
	cfg           *config.Config
	db            *sqlx.DB
	redisClient   *redis.Client
	s3Client      *s3.Client
	preSignClient *s3.PresignClient
	logger        logger.Logger
}

func NewServer(cfg *config.Config, db *sqlx.DB, redisClient *redis.Client, s3Client *s3.Client, preSignClient *s3.PresignClient, logger logger.Logger) *Server {
	return &Server{
		echo:          echo.New(),
		cfg:           cfg,
		db:            db,
		redisClient:   redisClient,
		s3Client:      s3Client,
		preSignClient: preSignClient,
		logger:        logger,
	}
}

func (s *Server) Run() error {
	if err := s.MapHandlers(s.echo); err != nil {
		return nil
	}
	s.echo.Server.MaxHeaderBytes = maxHeaderBytes
	s.echo.Server.ReadTimeout = time.Second * s.echo.Server.ReadTimeout
	s.echo.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"}, // Add your frontend URLs here
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true, // This is crucial for cookies
		MaxAge:           300,  // Optional: cache preflight requests
	}))
	server := &http.Server{
		Addr:         s.cfg.Server.Port,
		ReadTimeout:  time.Second * s.echo.Server.ReadTimeout,
		IdleTimeout:  time.Second * s.echo.Server.IdleTimeout,
		WriteTimeout: time.Second * s.echo.Server.WriteTimeout,
	}
	go func() {
		if err := s.echo.StartServer(server); err != nil {
			s.logger.Fatal("error starting  Server: ", err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, os.Interrupt)
	<-quit

	ctx, shutdown := context.WithTimeout(context.Background(), time.Second*ctxTimeout)
	defer shutdown()
	s.logger.Infof("shutting down server")
	return s.echo.Server.Shutdown(ctx)
}
