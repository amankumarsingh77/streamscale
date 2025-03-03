package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	NewVideoJobsQueue = "video_jobs"
	JobChannel        = "new_video_jobs_channel"
)

type EncodeJob struct {
	JobID                  string             `json:"job_id" redis:"job_id"`
	UserID                 string             `json:"user_id" redis:"user_id"`
	VideoID                string             `json:"video_id" redis:"video_id"`
	InputS3Key             string             `json:"input_s3_key" redis:"input_s3_key"`
	InputBucket            string             `json:"input_bucket" redis:"input_bucket"`
	Progress               float64            `json:"progress" redis:"progress"`
	OutputS3Key            string             `json:"output_s3_key" redis:"output_s3_key"`
	Codec                  string             `json:"codec" redis:"codec"`
	OutputBucket           string             `json:"output_bucket" redis:"output_bucket"`
	Qualities              []InputQualityInfo `json:"qualities" redis:"qualities"`
	OutputFormats          []PlaybackFormat   `json:"output_formats" redis:"output_formats"`
	EnablePerTitleEncoding bool               `json:"enable_per_title_encoding" redis:"enable_per_title_encoding"`
	Status                 JobStatus          `json:"status" redis:"status"`
	StartedAt              time.Time          `json:"started_at" redis:"started_at"`
	CompletedAt            time.Time          `json:"completed_at" redis:"completed_at"`
}

type InputQualityInfo struct {
	// Define fields as per your requirements
}

type PlaybackFormat struct {
	// Define fields as per your requirements
}

type JobStatus string

const (
	JobStatusQueued     JobStatus = "queued"
	JobStatusProcessing JobStatus = "in_progress"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

func main() {
	// Initialize Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr:     "intimate-racer-53028.upstash.io:6379",
		Password: "Ac8kAAIjcDE2N2JmODcxY2U1MzI0MWU5OTA3MGY5YjM0Y2FjMjIxN3AxMA",
		DB:       0,
		TLSConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	})

	// Create a job
	job := EncodeJob{
		JobID:                  "12345",
		UserID:                 "4d27c85d-2d44-4c19-984e-fe85d346effc",
		VideoID:                "4d27c85d-2d44-4c19-984e-fe85d346effc",
		InputS3Key:             "marco.mp4",
		InputBucket:            "input-bucket",
		Codec:                  "h264",
		Progress:               0.0,
		OutputS3Key:            "output/marco",
		OutputBucket:           "output-bucket",
		Qualities:              []InputQualityInfo{},
		OutputFormats:          []PlaybackFormat{},
		EnablePerTitleEncoding: false,
		Status:                 JobStatusQueued,
		StartedAt:              time.Now(),
		CompletedAt:            time.Time{},
	}

	ctx := context.Background()

	// Store job details in a hash
	jobKey := fmt.Sprintf("job:%s", job.JobID)
	jobJSON, err := json.Marshal(job)
	if err != nil {
		fmt.Println("Error marshalling job:", err)
		return
	}

	// Use pipeline for atomic operations
	pipe := rdb.Pipeline()

	// Push job to new_video_jobs queue
	pipe.LPush(ctx, NewVideoJobsQueue, jobJSON)

	// Store job details in a hash for easy access
	pipe.HSet(ctx, jobKey, map[string]interface{}{
		"job_id":        job.JobID,
		"user_id":       job.UserID,
		"video_id":      job.VideoID,
		"input_key":     job.InputS3Key,
		"output_key":    job.OutputS3Key,
		"status":        string(job.Status),
		"started_at":    job.StartedAt.Format(time.RFC3339),
		"input_bucket":  job.InputBucket,
		"output_bucket": job.OutputBucket,
	})

	// Set TTL for job details (24 hours)
	pipe.Expire(ctx, jobKey, 24*time.Hour)

	// Publish notification about new job
	notification := map[string]interface{}{
		"job_id":    job.JobID,
		"video_id":  job.VideoID,
		"timestamp": time.Now().Format(time.RFC3339),
	}
	notificationJSON, _ := json.Marshal(notification)
	pipe.Publish(ctx, JobChannel, notificationJSON)

	// Execute all commands
	_, err = pipe.Exec(ctx)
	if err != nil {
		fmt.Println("Error executing Redis pipeline:", err)
		return
	}

	fmt.Printf("Job %s ingested successfully into Redis queue and notification published\n", job.JobID)

	// Optional: Demonstrate how to subscribe to notifications
	// Note: This is just for testing, in production the subscriber would be in a separate process

}
