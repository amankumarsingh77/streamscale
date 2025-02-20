package main

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/server"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/aws"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/postgres"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/redis"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"log"
)

func main() {
	log.Println("Starting server")
	configFile := "config.yml"
	cfgFile, err := config.LoadConfig(configFile)

	if err != nil {
		log.Fatalf("loadConfig: %v", err)
	}
	cfg, err := config.ParseConfig(cfgFile)
	if err != nil {
		log.Fatalf("parseConfig: %v", err)
	}
	appLogger := logger.NewApiLogger(cfg)
	appLogger.InitLogger()
	appLogger.Infof("AppVersion: %s, LogLevel: %s, Mode: %s", cfg.Server.AppVersion, cfg.Logger.Level, cfg.Server.Mode)
	psqlDB, err := postgres.NewPsqlDB(cfg)
	if err != nil {
		appLogger.Infof("could not connect to db: %s", err)
	}
	appLogger.Infof("db connected, status: %#v", psqlDB.Stats())
	defer psqlDB.Close()

	redisClient, err := redis.NewRedisClient(cfg)
	if err != nil {
		appLogger.Infof("could not connect to redis: %s", err)
	}
	appLogger.Infof("redis connected")

	s3Client, presignClient, err := aws.NewAWSClient(cfg.S3.Endpoint, cfg.S3.Region, cfg.S3.AccessKey, cfg.S3.SecretKey)
	if err != nil {
		appLogger.Infof("could not connect to s3: %s", err)
	}
	defer redisClient.Close()
	s := server.NewServer(cfg, psqlDB, redisClient, s3Client, presignClient, appLogger)
	if err = s.Run(); err != nil {
		appLogger.Infof("could not start server: %s", err)
	}
}
