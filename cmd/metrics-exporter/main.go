package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	queueName     = "video_jobs"
	metricsPort   = ":9090"
	pollInterval  = 5 * time.Second
)

var (
	queueLengthGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "redis_queue_length",
			Help: "Current length of the Redis job queue",
		},
		[]string{"queue"},
	)
)

func init() {
	prometheus.MustRegister(queueLengthGauge)
}

func main() {
	// Get Redis connection details from environment
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDB := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		var err error
		redisDB, err = strconv.Atoi(dbStr)
		if err != nil {
			log.Fatalf("Invalid REDIS_DB value: %v", err)
		}
	}

	// Initialize Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       redisDB,
	})

	// Test Redis connection
	ctx := context.Background()
	if _, err := redisClient.Ping(ctx).Result(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis successfully")

	// Start metrics collection in a goroutine
	go collectMetrics(ctx, redisClient)

	// Expose metrics endpoint
	http.Handle("/metrics", promhttp.Handler())
	log.Printf("Starting metrics server on %s", metricsPort)
	if err := http.ListenAndServe(metricsPort, nil); err != nil {
		log.Fatalf("Failed to start metrics server: %v", err)
	}
}

func collectMetrics(ctx context.Context, client *redis.Client) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Get queue length
			queueLength, err := client.LLen(ctx, queueName).Result()
			if err != nil {
				log.Printf("Error getting queue length: %v", err)
				continue
			}

			// Update Prometheus gauge
			queueLengthGauge.WithLabelValues(queueName).Set(float64(queueLength))
			log.Printf("Queue %s length: %d", queueName, queueLength)
		}
	}
}
