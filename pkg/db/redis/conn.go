package redis

import (
	"crypto/tls"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/go-redis/redis/v8"
	"time"
)

func NewRedisClient(config *config.Config) (*redis.Client, error) {
	redisHost := config.Redis.RedisAddr

	if redisHost == "" {
		redisHost = ":6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:         redisHost,
		Password:     config.Redis.RedisPassword,
		DB:           config.Redis.DB,
		MinIdleConns: config.Redis.MinIdleConns,
		TLSConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
		PoolSize:    config.Redis.PoolSize,
		PoolTimeout: time.Duration(config.Redis.PoolTimeout) * time.Second,
	})
	if err := client.Ping(client.Context()).Err(); err != nil {
		return nil, err
	}
	return client, nil
}
