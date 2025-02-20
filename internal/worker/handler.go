package worker

//import (
//	"context"
//	"fmt"
//	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
//	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
//	"github.com/google/uuid"
//	"log"
//	"mime"
//	"os"
//	"path/filepath"
//)
//
//const (
//	VideoJobsQueueKey = "video_jobs"
//	outPath           = "output"
//)
//
//func (w *Worker) StartJob(ctx context.Context) error {
//	job, err := w.redisRepo.PeekJob(ctx, VideoJobsQueueKey)
//	if err != nil {
//		return err
//	}
//	defer func() {
//		log.Println("Cleaning temporary files...")
//		os.RemoveAll(TempDir)
//	}()
//	//Download the video
//	localVideoPath, err := downloadVideo(ctx, w.awsRepo, w.cfg.S3.InputBucket, job.InputS3Key)
//	if err != nil {
//		return err
//	}
//
//	//Process the video
//	if err := ProcessVideo(ctx, localVideoPath, outPath, w.cfg.S3.OutputBucket, w.awsRepo); err != nil {
//		return err
//	}
//	return nil
//
//}
//
////func (p *videoProcessor) downloadVideo(ctx context.Context, inputKey string) (string, error) {
////	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
////		return "", fmt.Errorf("failed to create temp directory: %w", err)
////	}
////
////	localPath := filepath.Join(p.tempDir, filepath.Base(inputKey))
////
////	videoFile, err := p.awsRepo.GetObject(ctx, p.cfg.S3.InputBucket, inputKey)
////	if err != nil {
////		return "", fmt.Errorf("failed to get object from S3: %w", err)
////	}
////	defer videoFile.Body.Close()
////
////	outFile, err := os.Create(localPath)
////	if err != nil {
////		return "", fmt.Errorf("failed to create local video file: %w", err)
////	}
////	defer outFile.Close()
////
////	if _, err = io.Copy(outFile, videoFile.Body); err != nil {
////		return "", fmt.Errorf("failed to write video file: %w", err)
////	}
////
////	return localPath, nil
////}
//
//func ProcessVideo(ctx context.Context, inputPath, outputPath string, outputBucket string, awsRepo videofiles.AWSRepository) error {
//	defer func() {
//		log.Println("Cleaning temporary files...")
//		os.RemoveAll(TempDir)
//	}()
//	videoInfo, err := GetVideoInfo(inputPath)
//	if err != nil {
//		return fmt.Errorf("failed to get video info: %w", err)
//	}
//	segments, err := SplitVideo(inputPath, TempDir, videoInfo)
//	if err != nil {
//		return fmt.Errorf("splitting failed: %w", err)
//	}
//	spatial, temporal, err := AnalyzeComplexity(segments[0])
//	if err != nil {
//		return fmt.Errorf("complexity analysis failed: %w", err)
//	}
//	bitrate := ComputeBitrate(videoInfo, spatial, temporal)
//	encodedSegments, err := ParallelEncodeSegments(segments, bitrate)
//	if err != nil {
//		return fmt.Errorf("encoding failed: %w", err)
//	}
//	if err := StitchSegments(encodedSegments, outputPath); err != nil {
//		return fmt.Errorf("stitching failed: %w", err)
//	}
//	// dir := os.TempDir()
//	dir, err := os.Getwd()
//	if err != nil {
//		return fmt.Errorf("failed to get current working directory: %w", err)
//	}
//	finalOutput := filepath.Join(dir, "finalOutput")
//	if err := PackageVideo(inputPath, finalOutput); err != nil {
//		return fmt.Errorf("packaging failed: %w", err)
//	}
//	_, err = UploadPackagedVideo(ctx, finalOutput, outputBucket, awsRepo)
//	if err != nil {
//		return fmt.Errorf("failed to upload packaged video: %w", err)
//	}
//	if err := os.RemoveAll(finalOutput); err != nil {
//		return fmt.Errorf("failed to remove final output directory: %w", err)
//	}
//	return nil
//}
//
//func UploadPackagedVideo(ctx context.Context, finalOutput string, outputBucket string, awsRepo videofiles.AWSRepository) (string, error) {
//	files, err := os.ReadDir(finalOutput)
//	if err != nil {
//		return "", fmt.Errorf("failed to read directory: %w", err)
//	}
//
//	var uploadedFiles []string
//
//	for _, file := range files {
//		if file.IsDir() {
//			continue
//		}
//
//		filePath := filepath.Join(finalOutput, file.Name())
//
//		fileHandle, err := os.Open(filePath)
//		if err != nil {
//			return "", fmt.Errorf("failed to open file: %w", err)
//		}
//		defer fileHandle.Close()
//
//		fileInfo, err := fileHandle.Stat()
//		if err != nil {
//			return "", fmt.Errorf("failed to get file info: %w", err)
//		}
//
//		mimeType := mime.TypeByExtension(filepath.Ext(file.Name()))
//		if mimeType == "" {
//			mimeType = "application/octet-stream"
//		}
//
//		s3Key := filepath.Join(uuid.New().String(), "packaged", file.Name())
//
//		videoInput := models.UploadInput{
//			File:       fileHandle,
//			BucketName: outputBucket,
//			Name:       file.Name(),
//			MimeType:   mimeType,
//			Size:       fileInfo.Size(),
//			Key:        s3Key,
//		}
//
//		_, err = awsRepo.PutObject(ctx, videoInput)
//		if err != nil {
//			return "", fmt.Errorf("failed to upload file: %w", err)
//		}
//
//		uploadedFiles = append(uploadedFiles, s3Key)
//	}
//
//	if len(uploadedFiles) == 0 {
//		return "", fmt.Errorf("no files uploaded")
//	}
//
//	return uploadedFiles[0], nil
//}
