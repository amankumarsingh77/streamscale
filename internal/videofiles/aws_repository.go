package videofiles

import (
	"context"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type AWSRepository interface {
	GetPresignedURL(ctx context.Context, input *models.UploadInput) (string, error)
	PutObject(ctx context.Context, input models.UploadInput) (*s3.PutObjectOutput, error)
	GetObject(ctx context.Context, bucket, filename string) (*s3.GetObjectOutput, error)
	ListObjects(ctx context.Context, bucket string) ([]string, error)
	RemoveObject(ctx context.Context, bucket, filename string) error
}
