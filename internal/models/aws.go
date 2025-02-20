package models

import "io"

type UploadInput struct {
	File       io.Reader `json:"file,omitempty"`
	Name       string    `json:"name,required"`
	MimeType   string    `json:"mime_type,required"`
	Size       int64     `json:"size,required"`
	Key        string    `json:"key,required"`
	BucketName string    `json:"bucket_name,required"`
}
