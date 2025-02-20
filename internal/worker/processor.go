package worker

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"math"
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/google/uuid"
)

const (
	maxConcurrentUploads = 50
)

type videoProcessor struct {
	cfg       *config.Config
	awsRepo   videofiles.AWSRepository
	videoRepo videofiles.Repository
	logger    logger.Logger
	tempDir   string
}

func NewVideoProcessor(cfg *config.Config, awsRepo videofiles.AWSRepository, videoRepo videofiles.Repository, logger logger.Logger) VideoProcessor {
	return &videoProcessor{
		cfg:       cfg,
		awsRepo:   awsRepo,
		videoRepo: videoRepo,
		logger:    logger,
		tempDir:   TempDir,
	}
}

type ProcessingResult struct {
	Duration  float64
	Width     int
	Height    int
	Qualities []models.InputQualityInfo
}

func (p *videoProcessor) ProcessVideo(ctx context.Context, inputKey, outputKey string, videoID uuid.UUID) (*ProcessingResult, error) {
	if inputKey == "" || outputKey == "" {
		return nil, fmt.Errorf("input key and output key cannot be empty")
	}

	defer p.cleanup()

	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	localPath, err := p.downloadVideo(ctx, inputKey)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	// Update progress after download (20%)
	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 20); err != nil {
		p.logger.Errorf("Failed to update progress after download: %v", err)
	}

	videoInfo, err := GetVideoInfo(localPath)
	if err != nil {
		return nil, fmt.Errorf("video info extraction failed: %w", err)
	}
	// Update progress after video info extraction (40%)
	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 40); err != nil {
		p.logger.Errorf("Failed to update progress after info extraction: %v", err)
	}

	segments, err := p.splitVideo(localPath, videoInfo)
	if err != nil {
		return nil, fmt.Errorf("split failed: %w", err)
	}
	// Update progress after video splitting (60%)
	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 60); err != nil {
		p.logger.Errorf("Failed to update progress after splitting: %v", err)
	}

	bitrate, err := p.analyzeBitrate(segments[0], videoInfo)
	if err != nil {
		return nil, fmt.Errorf("bitrate analysis failed: %w", err)
	}

	encodedSegments, err := p.encodeSegments(segments, bitrate)
	if err != nil {
		return nil, fmt.Errorf("encoding failed: %w", err)
	}
	// Update progress after encoding (80%)
	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 80); err != nil {
		p.logger.Errorf("Failed to update progress after encoding: %v", err)
	}

	outputPath := filepath.Join(p.tempDir, "output")
	if err := os.MkdirAll(outputPath, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	if err := p.stitchAndPackage(encodedSegments, outputPath); err != nil {
		return nil, fmt.Errorf("finalization failed: %w", err)
	}

	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("output directory does not exist after processing")
	}

	outputKey = strings.TrimPrefix(outputKey, "/")
	outputKey = strings.TrimSuffix(outputKey, "/")

	if err := p.uploadProcessedFiles(ctx, outputPath, outputKey); err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	// Update progress after upload (90%)
	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 90); err != nil {
		p.logger.Errorf("Failed to update progress after upload: %v", err)
	}

	result := &ProcessingResult{
		Duration: videoInfo.Duration,
		Width:    videoInfo.Width,
		Height:   videoInfo.Height,
	}

	return result, nil
}

func (p *videoProcessor) uploadProcessedFiles(ctx context.Context, outputPath, outputKey string) error {
	if outputPath == "" || outputKey == "" {
		return fmt.Errorf("output path and key cannot be empty")
	}

	outputKey = strings.TrimPrefix(outputKey, "/")
	baseKey := strings.TrimSuffix(outputKey, filepath.Ext(outputKey))

	log.Printf("Starting concurrent upload process from %s with base key: %s", outputPath, baseKey)

	type uploadJob struct {
		path     string
		relPath  string
		s3Key    string
		fileInfo os.FileInfo
	}

	jobs := make(chan uploadJob)
	results := make(chan error)
	var wg sync.WaitGroup

	for i := 0; i < maxConcurrentUploads; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for job := range jobs {
				err := p.uploadSingleFile(ctx, job.path, job.s3Key, job.fileInfo)
				if err != nil {
					select {
					case results <- fmt.Errorf("worker %d failed to upload %s: %w", workerID, job.relPath, err):
					case <-ctx.Done():
					}
				} else {
					log.Printf("Worker %d successfully uploaded %s", workerID, job.s3Key)
				}
			}
		}(i)
	}

	go func() {
		// Upload all files from tmp_segments directory
		err := filepath.Walk(p.tempDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			if info.IsDir() {
				return nil
			}

			// Get the relative path from tempDir
			relPath, err := filepath.Rel(p.tempDir, path)
			if err != nil {
				return fmt.Errorf("failed to get relative path: %w", err)
			}

			relPath = filepath.ToSlash(relPath)
			s3Key := fmt.Sprintf("%s/processing/%s", baseKey, relPath)
			s3Key = strings.TrimPrefix(s3Key, "/")

			select {
			case jobs <- uploadJob{
				path:     path,
				relPath:  relPath,
				s3Key:    s3Key,
				fileInfo: info,
			}:
			case <-ctx.Done():
				return ctx.Err()
			}
			return nil
		})

		if err != nil {
			select {
			case results <- fmt.Errorf("failed to walk temp directory: %w", err):
			case <-ctx.Done():
			}
		}

		// Upload HLS/DASH files from outputPath
		err = filepath.Walk(outputPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			if info.IsDir() {
				return nil
			}

			relPath, err := filepath.Rel(outputPath, path)
			if err != nil {
				return fmt.Errorf("failed to get relative path: %w", err)
			}

			relPath = filepath.ToSlash(relPath)
			s3Key := fmt.Sprintf("%s/%s", baseKey, relPath)
			s3Key = strings.TrimPrefix(s3Key, "/")

			select {
			case jobs <- uploadJob{
				path:     path,
				relPath:  relPath,
				s3Key:    s3Key,
				fileInfo: info,
			}:
			case <-ctx.Done():
				return ctx.Err()
			}
			return nil
		})

		if err != nil {
			select {
			case results <- fmt.Errorf("failed to walk output directory: %w", err):
			case <-ctx.Done():
			}
		}

		close(jobs)
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	var uploadErrors []error
	for err := range results {
		if err != nil {
			uploadErrors = append(uploadErrors, err)
		}
	}

	if len(uploadErrors) > 0 {
		return fmt.Errorf("encountered %d upload errors: %v", len(uploadErrors), uploadErrors[0])
	}

	return nil
}

func (p *videoProcessor) uploadSingleFile(ctx context.Context, path, s3Key string, fileInfo os.FileInfo) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	contentType := getContentType(path)

	uploadInput := models.UploadInput{
		File:       file,
		BucketName: p.cfg.S3.OutputBucket,
		Key:        s3Key,
		MimeType:   contentType,
		Size:       fileInfo.Size(),
	}

	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if _, err := file.Seek(0, 0); err != nil {
			return fmt.Errorf("failed to reset file pointer: %w", err)
		}

		_, err := p.awsRepo.PutObject(ctx, uploadInput)
		if err == nil {
			return nil
		}

		if attempt < maxRetries {
			log.Printf("Upload attempt %d/%d failed for %s: %v. Retrying...",
				attempt, maxRetries, s3Key, err)
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		return fmt.Errorf("failed to upload after %d attempts: %w", maxRetries, err)
	}

	return nil
}

func getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	case ".m4s":
		return "video/iso.segment"
	case ".mpd":
		return "application/dash+xml"
	case ".json":
		return "application/json"
	default:
		if contentType := mime.TypeByExtension(ext); contentType != "" {
			return contentType
		}
		return "application/octet-stream"
	}
}
func (p *videoProcessor) cleanup() {
	os.RemoveAll(p.tempDir)
}

func (p *videoProcessor) downloadVideo(ctx context.Context, inputKey string) (string, error) {
	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	localPath := filepath.Join(p.tempDir, filepath.Base(inputKey))

	videoFile, err := p.awsRepo.GetObject(ctx, p.cfg.S3.InputBucket, inputKey)
	if err != nil {
		return "", fmt.Errorf("failed to get object from S3: %w", err)
	}
	defer videoFile.Body.Close()

	outFile, err := os.Create(localPath)
	if err != nil {
		return "", fmt.Errorf("failed to create local video file: %w", err)
	}
	defer outFile.Close()

	if _, err = io.Copy(outFile, videoFile.Body); err != nil {
		return "", fmt.Errorf("failed to write video file: %w", err)
	}

	return localPath, nil
}

func (p *videoProcessor) splitVideo(inputPath string, videoInfo *VideoInfo) ([]string, error) {
	segmentDir := filepath.Join(p.tempDir, "segments")
	if err := os.MkdirAll(segmentDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create segment directory: %w", err)
	}

	segmentCount := math.Min(math.Ceil(videoInfo.Duration/MinSegmentDuration), MaxSegments)
	segmentDuration := math.Ceil(videoInfo.Duration / segmentCount)

	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-c", "copy",
		"-f", "segment",
		"-segment_time", fmt.Sprintf("%.0f", segmentDuration),
		"-reset_timestamps", "1",
		"-segment_format_options", "movflags=+faststart",
		filepath.Join(segmentDir, "segment_%03d.mp4"),
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("splitting failed: %v, stderr: %s", err, stderr.String())
	}

	segments, err := filepath.Glob(filepath.Join(segmentDir, "segment_*.mp4"))
	if err != nil {
		return nil, fmt.Errorf("failed to list segments: %w", err)
	}

	if len(segments) == 0 {
		return nil, fmt.Errorf("no segments were created")
	}

	return segments, nil
}

func (p *videoProcessor) encodeSingleSegment(inputPath, outputPath string, bitrate int) error {
	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-c:v", "libsvtav1",
		"-preset", "9",
		"-crf", "32",
		"-g", "240",
		"-svtav1-params",
		fmt.Sprintf("tune=0:film-grain=0:fast-decode=1:mbr=400000"),
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "128k",
		"-y", outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg encoding failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func StitchSegments(segments []string, outputPath string) error {
	listFile := "concat_list.txt"
	file, err := os.Create(listFile)
	if err != nil {
		return err
	}
	defer os.Remove(listFile)

	for _, seg := range segments {

		absPath, err := filepath.Abs(seg)
		if err != nil {
			return err
		}
		file.WriteString(fmt.Sprintf("file '%s'\n", absPath))
	}
	file.Close()

	cmd := exec.Command("ffmpeg",
		"-f", "concat",
		"-safe", "0",
		"-i", listFile,
		"-c", "copy",
		"-movflags", "+faststart",
		"-y", outputPath,
	)

	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout
	return cmd.Run()
}

func (p *videoProcessor) encodeSegments(segments []string, bitrate int) ([]string, error) {
	type encodeResult struct {
		index int
		path  string
		err   error
	}

	resultChan := make(chan encodeResult, len(segments))
	sem := make(chan struct{}, MaxParallelJobs)
	var wg sync.WaitGroup

	outputDir := filepath.Join(p.tempDir, "encoded_segments")
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	for i, segment := range segments {
		wg.Add(1)
		go func(idx int, inputPath string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			outputPath := filepath.Join(outputDir, fmt.Sprintf("encoded_%03d.mp4", idx))
			err := p.encodeSingleSegment(inputPath, outputPath, bitrate)

			resultChan <- encodeResult{
				index: idx,
				path:  outputPath,
				err:   err,
			}
		}(i, segment)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	encodedSegments := make([]string, len(segments))
	for result := range resultChan {
		if result.err != nil {
			return nil, fmt.Errorf("segment %d encoding failed: %w", result.index, result.err)
		}
		encodedSegments[result.index] = result.path
	}

	return encodedSegments, nil
}

func GetVideoInfo(inputPath string) (*VideoInfo, error) {
	dir, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	finalPath := filepath.Join(dir, inputPath)
	cmd := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0",
		"-show_entries", "stream=width,height", "-of", "csv=p=0", finalPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("ffprobe error: %v output: %v", err, string(output))
	}

	trimmedOutput := strings.TrimSpace(string(output))
	trimmedOutput = strings.TrimRight(trimmedOutput, ",")
	parts := strings.Split(trimmedOutput, ",")

	if len(parts) != 2 {
		return nil, fmt.Errorf("unexpected ffprobe output: %s", trimmedOutput)
	}

	width, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid width: %v", err)
	}

	height, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid height: %v", err)
	}

	cmd = exec.Command("ffprobe", "-v", "error", "-show_entries",
		"format=duration", "-of", "csv=p=0", finalPath)
	durationOutput, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("ffprobe duration error: %v", err)
	}

	duration, err := strconv.ParseFloat(strings.TrimSpace(string(durationOutput)), 64)
	if err != nil {
		return nil, fmt.Errorf("invalid duration: %v", err)
	}

	return &VideoInfo{
		Width:    width,
		Height:   height,
		Duration: duration,
	}, nil
}

func (p *videoProcessor) parseLogFile(filename, key string) (float64, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	var sum float64
	var count int
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, key) {
			parts := strings.Split(line, "=")
			if len(parts) < 2 {
				continue
			}
			val, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
			if err != nil {
				continue
			}
			sum += val
			count++
		}
	}

	if err := scanner.Err(); err != nil {
		return 0, fmt.Errorf("error reading log file: %w", err)
	}

	if count == 0 {
		return 0, fmt.Errorf("no valid entries found for key %s", key)
	}

	return sum / float64(count), nil
}

func (p *videoProcessor) analyzeComplexity(inputPath string) (spatial, temporal float64, err error) {
	dir := filepath.Dir(inputPath)
	spatialLog := filepath.Join(dir, "spatial.log")
	temporalLog := filepath.Join(dir, "temporal.log")

	defer os.Remove(spatialLog)
	defer os.Remove(temporalLog)

	cmdSpatial := exec.Command("ffmpeg",
		"-i", inputPath,
		"-vf", "signalstats=stat=tout,metadata=print:key=lavfi.signalstats.YAVG:file="+spatialLog,
		"-f", "null", "-",
	)

	var spatialStderr bytes.Buffer
	cmdSpatial.Stderr = &spatialStderr

	if err := cmdSpatial.Run(); err != nil {
		return 0, 0, fmt.Errorf("spatial analysis failed: %v, stderr: %s", err, spatialStderr.String())
	}

	yavg, err := p.parseLogFile(spatialLog, "lavfi.signalstats.YAVG=")
	if err != nil {
		return 0, 0, fmt.Errorf("parsing spatial log failed: %w", err)
	}
	spatial = math.Pow(yavg, 2)

	cmdTemp := exec.Command("ffmpeg",
		"-i", inputPath,
		"-vf", "signalstats=stat=tout,metadata=print:key=lavfi.signalstats.YDIF:file="+temporalLog,
		"-f", "null", "-",
	)

	var temporalStderr bytes.Buffer
	cmdTemp.Stderr = &temporalStderr

	if err := cmdTemp.Run(); err != nil {
		return 0, 0, fmt.Errorf("temporal analysis failed: %v, stderr: %s", err, temporalStderr.String())
	}

	temporal, err = p.parseLogFile(temporalLog, "lavfi.signalstats.YDIF=")
	if err != nil {
		return 0, 0, fmt.Errorf("parsing temporal log failed: %w", err)
	}

	return spatial, temporal, nil
}

func (p *videoProcessor) analyzeBitrate(sampleSegment string, videoInfo *VideoInfo) (int, error) {

	spatial, temporal, err := p.analyzeComplexity(sampleSegment)
	if err != nil {
		return 0, fmt.Errorf("complexity analysis failed: %w", err)
	}

	pixels := videoInfo.Width * videoInfo.Height
	baseBitrate := DefaultBaseBitrate
	switch {
	case pixels >= 1920*1080:
		baseBitrate = FullHDBaseBitrate
	case pixels >= 1280*720:
		baseBitrate = HDBaseBitrate
	}

	spatialComplexity := math.Min(spatial/800.0, 1.0)
	temporalComplexity := math.Min(temporal/40.0, 1.0)

	complexityScore := (spatialComplexity*0.7 + temporalComplexity*0.3)

	adjustedBitrate := int(float64(baseBitrate) * (0.3 + 0.7*complexityScore))

	return adjustedBitrate, nil
}
