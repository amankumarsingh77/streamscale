package models

import (
	"time"

	"github.com/google/uuid"
)

type VideoFile struct {
	VideoID      uuid.UUID     `json:"video_id" db:"video_id" redis:"video_id" validate:"omitempty"`
	UserID       uuid.UUID     `json:"user_id" db:"user_id" redis:"user_id" validate:"omitempty"`
	FileName     string        `json:"file_name" db:"file_name" redis:"file_name" validate:"required,lte=255"`
	FileSize     int64         `json:"file_size" db:"file_size" redis:"file_size" validate:"required"`
	Duration     *int64        `json:"duration" db:"duration" redis:"duration" validate:"omitempty"`
	S3Key        string        `json:"s3_key" db:"s3_key" redis:"s3_key" validate:"required,lte=255"`
	Status       JobStatus     `json:"status" db:"status" redis:"status" validate:"omitempty"`
	Progress     int           `json:"progress" db:"progress" redis:"progress" validate:"omitempty"`
	S3Bucket     string        `json:"s3_bucket" db:"s3_bucket" redis:"s3_bucket" validate:"required,lte=255"`
	Format       string        `json:"format" db:"format" redis:"format" validate:"required,lte=20"`
	UploadedAt   time.Time     `json:"uploaded_at" db:"uploaded_at" redis:"uploaded_at" validate:"omitempty"`
	PlaybackInfo *PlaybackInfo `json:"-"`
	UpdatedAt    time.Time     `json:"updated_at" db:"updated_at" redis:"updated_at" validate:"omitempty"`
}

type FilterOptions struct {
	UserID    string
	Status    string
	StartDate string
	EndDate   string
}

type VideoList struct {
	Videos     []*VideoFile `json:"videos"`
	TotalCount int          `json:"total_count"`
	Page       int          `json:"page"`
	PageSize   int          `json:"page_size"`
	HasMore    bool         `json:"has_more"`
}

type VideoUploadInput struct {
	FileName               string             `json:"filename" validate:"required,lte=255"`
	FileSize               int64              `json:"file_size" validate:"required"`
	Duration               int64              `json:"duration" validate:"required"`
	Codec                  Codec              `json:"codec" validate:"required"`
	Format                 string             `json:"format" validate:"required,lte=20"`
	Qualities              []InputQualityInfo `json:"qualities" validate:"dive"`
	OutputFormats          []PlaybackFormat   `json:"output_formats" validate:"dive"`
	EnablePerTitleEncoding bool               `json:"enable_per_title_encoding"`
}
