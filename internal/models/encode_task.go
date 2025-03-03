package models

import "time"

type JobStatus string

type Codec string

const (
	CodecH264 Codec = "h264"
	CodecAV1  Codec = "av1"
)

const (
	JobStatusQueued     JobStatus = "queued"
	JobStatusProcessing JobStatus = "in_progress"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

type EncodeJob struct {
	JobID                  string             `json:"job_id" db:"job_id" redis:"job_id" validate:"omitempty"`
	UserID                 string             `json:"user_id" db:"user_id" redis:"user_id" validate:"omitempty"`
	VideoID                string             `json:"video_id" db:"video_id" redis:"video_id" validate:"omitempty"`
	InputS3Key             string             `json:"input_s3_key" db:"input_s3_key" redis:"input_s3_key" validate:"required"`
	InputBucket            string             `json:"input_bucket" db:"input_bucket" redis:"input_bucket" validate:"required"`
	Codec                  Codec              `json:"codec" db:"codec" redis:"codec" validate:"required"`
	Progress               float64            `json:"progress" db:"progress" redis:"progress" validate:"omitempty"`
	OutputS3Key            string             `json:"output_s3_key" db:"output_s3_key" redis:"output_s3_key" validate:"required"`
	OutputBucket           string             `json:"output_bucket" db:"output_bucket" redis:"output_bucket" validate:"required"`
	Qualities              []InputQualityInfo `json:"qualities" db:"qualities" redis:"qualities" validate:"omitempty"`
	OutputFormats          []PlaybackFormat   `json:"output_formats" db:"output_formats" redis:"output_formats" validate:"omitempty"`
	EnablePerTitleEncoding bool               `json:"enable_per_title_encoding" db:"enable_per_title_encoding" redis:"enable_per_title_encoding" validate:"omitempty"`
	Status                 JobStatus          `json:"status" db:"status" redis:"status" validate:"required"`
	StartedAt              time.Time          `json:"started_at" db:"started_at" redis:"started_at" validate:"omitempty"`
	CompletedAt            time.Time          `json:"completed_at" db:"completed_at" redis:"completed_at" validate:"omitempty"`
}
