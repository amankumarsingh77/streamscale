package repository

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type awsRepository struct {
	client        *s3.Client
	preSignClient *s3.PresignClient
}

func NewAwsRepository(awsClient *s3.Client, preSignClient *s3.PresignClient) videofiles.AWSRepository {
	return &awsRepository{
		preSignClient: preSignClient,
		client:        awsClient,
	}
}

func (a *awsRepository) GetPresignedURL(ctx context.Context, input *models.UploadInput) (string, error) {
	pattern := `.+(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpeg|mpg|3gp|ogv|vob|ts|mxf)$`
	re := regexp.MustCompile(pattern)
	if !re.MatchString(input.Name) {
		return "", fmt.Errorf("invalid file format: %s", input.Name)
	}
	pubObjectReq, err := a.preSignClient.PresignPutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:        &input.BucketName,
			Key:           &input.Key,
			ContentLength: &input.Size,
			ContentType:   &input.MimeType,
		},
		s3.WithPresignExpires(60*time.Minute),
	)
	if err != nil {
		return "", fmt.Errorf("failed to presign put object : %w", err)
	}
	return pubObjectReq.URL, nil
}

// This thing is useless as not more than 10 users can upload videos at once. But just letting it be here.
func (a *awsRepository) PutObject(ctx context.Context, input models.UploadInput) (*s3.PutObjectOutput, error) {
	//pattern := `^.+\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpeg|mpg|3gp|ogv|vob|ts|mxf|)$`
	//re := regexp.MustCompile(pattern)
	//if !re.MatchString(input.Name) {
	//	return nil, fmt.Errorf("invalid file format: %s", input.Name)
	//}
	log.Println(input)
	res, err := a.client.PutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:        &input.BucketName,
			Key:           &input.Key,
			ContentType:   &input.MimeType,
			ContentLength: &input.Size,
			Body:          input.File,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file : %w", err)
	}
	return res, nil
}

func (a *awsRepository) ListObjects(ctx context.Context, bucket string) ([]string, error) {
	res, err := a.client.ListObjectsV2(
		ctx,
		&s3.ListObjectsV2Input{
			Bucket: &bucket,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list objects : %w", err)
	}
	var keys []string
	for _, obj := range res.Contents {
		keys = append(keys, *obj.Key)
	}
	return keys, nil
}

func (a *awsRepository) GetObject(ctx context.Context, bucket, fileKey string) (*s3.GetObjectOutput, error) {
	res, err := a.client.GetObject(
		ctx,
		&s3.GetObjectInput{
			Bucket: &bucket,
			Key:    &fileKey,
		},
	)
	log.Println(bucket, fileKey)
	if err != nil {
		return nil, fmt.Errorf("failed to download file : %w", err)
	}
	return res, nil
}

func (a *awsRepository) RemoveObject(ctx context.Context, bucket, filename string) error {
	_, err := a.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &filename,
	})
	if err != nil {
		return fmt.Errorf("failed to remove file : %w", err)
	}
	return nil
}
