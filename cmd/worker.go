package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles/repository"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/worker"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/aws"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/postgres"
	clientRedis "github.com/amankumarsingh77/cloud-video-encoder/pkg/db/redis"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
)

const (
	redisAddr     = "localhost:6379"
	queueName     = "video_jobs"
	maxCPUUsage   = 80.0
	checkInterval = 10 * time.Second
)

func main() {
	// Load configuration
	configFile := "config.yml"
	cfgFile, err := config.LoadConfig(configFile)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	cfg, err := config.ParseConfig(cfgFile)
	if err != nil {
		log.Fatalf("Failed to parse config: %v", err)
	}

	// Initialize logger
	appLogger := logger.NewApiLogger(cfg)
	appLogger.InitLogger()
	appLogger.Infof("Starting worker service - Version: %s, LogLevel: %s, Mode: %s",
		cfg.Server.AppVersion, cfg.Logger.Level, cfg.Server.Mode)

	// Initialize PostgreSQL
	psqlDB, err := postgres.NewPsqlDB(cfg)
	if err != nil {
		appLogger.Fatalf("PostgreSQL init error: %s", err)
	}
	defer psqlDB.Close()
	appLogger.Info("PostgreSQL connected successfully")

	// Initialize Redis
	redisClient, err := clientRedis.NewRedisClient(cfg)
	if err != nil {
		appLogger.Fatalf("Redis init error: %s", err)
	}
	appLogger.Info("Redis connected successfully")

	// Initialize AWS clients
	awsClient, presignClient, err := aws.NewAWSClient(
		cfg.S3.Endpoint,
		cfg.S3.Region,
		cfg.S3.AccessKey,
		cfg.S3.SecretKey,
	)
	if err != nil {
		appLogger.Fatalf("AWS init error: %s", err)
	}
	appLogger.Info("AWS client initialized successfully")

	// Initialize repositories
	awsRepo := repository.NewAwsRepository(awsClient, presignClient)
	redisRepo := repository.NewVideoRedisRepo(redisClient)
	videoRepo := repository.NewVideoRepo(psqlDB)

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize and start worker pool
	videoWorker, err := worker.NewWorker(cfg, appLogger, redisRepo, awsRepo, videoRepo)
	if err != nil {
		appLogger.Fatalf("Failed to initialize worker: %s", err)
	}
	if err := videoWorker.Start(ctx); err != nil {
		appLogger.Fatalf("Failed to start worker: %s", err)
	}

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Create a WaitGroup for graceful shutdown
	var wg sync.WaitGroup

	// Start health check routine
	wg.Add(1)
	go func() {
		defer wg.Done()
		runHealthCheck(ctx, appLogger, cfg)
	}()

	// Wait for shutdown signal
	sig := <-sigChan
	appLogger.Infof("Received shutdown signal: %v", sig)

	// Cancel context to stop all goroutines
	cancel()

	// Initialize graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	// Wait for all goroutines to finish or timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		appLogger.Info("Graceful shutdown completed")
	case <-shutdownCtx.Done():
		appLogger.Warn("Shutdown timed out")
	}

	// Stop the worker
	videoWorker.Stop()

	// Wait for shutdown context
	<-shutdownCtx.Done()
	appLogger.Info("Worker service stopped successfully")
}

func runHealthCheck(ctx context.Context, logger logger.Logger, cfg *config.Config) {
	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Health check stopped")
			return
		case <-ticker.C:
			canAccept, cpuUsage := utils.CheckCPUUsage(cfg.Worker.MaxCPUUsage)
			if canAccept == false {
				logger.Warnf("High CPU usage detected: %.2f%%", cpuUsage)
			} else {
				logger.Infof("Current CPU usage: %.2f%%", cpuUsage)
			}
		}
	}
}
