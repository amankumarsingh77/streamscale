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
	maxConcurrentUploads = 2
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

type QualityPreset struct {
	Name       models.VideoQuality
	Resolution [2]int
	Bitrate    int
}

var qualityPresets = []QualityPreset{
	{Name: models.Quality1080P, Resolution: [2]int{1920, 1080}, Bitrate: 4500},
	{Name: models.Quality720P, Resolution: [2]int{1280, 720}, Bitrate: 2500},
	{Name: models.Quality480P, Resolution: [2]int{854, 480}, Bitrate: 1000},
	{Name: models.Quality360P, Resolution: [2]int{640, 360}, Bitrate: 600},
}

func (p *videoProcessor) ProcessVideo(ctx context.Context, job *models.EncodeJob, videoID uuid.UUID) (*ProcessingResult, error) {
	if job.InputS3Key == "" || job.OutputS3Key == "" {
		return nil, fmt.Errorf("input key and output key cannot be empty")
	}

	defer p.cleanup()

	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	localPath, err := p.downloadVideo(ctx, job.InputS3Key)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 10); err != nil {
		p.logger.Errorf("Failed to update progress after download: %v", err)
	}

	videoInfo, err := GetVideoInfo(localPath)
	if err != nil {
		return nil, fmt.Errorf("video info extraction failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 20); err != nil {
		p.logger.Errorf("Failed to update progress after info extraction: %v", err)
	}

	segments, err := p.splitVideo(localPath, videoInfo)
	if err != nil {
		return nil, fmt.Errorf("split failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 30); err != nil {
		p.logger.Errorf("Failed to update progress after splitting: %v", err)
	}

	applicablePresets := p.determineApplicablePresets(videoInfo)

	qualitySegments := make(map[models.VideoQuality][]string)
	qualityInfos := make([]models.InputQualityInfo, 0, len(applicablePresets))

	for i, preset := range applicablePresets {
		p.logger.Infof("Encoding for quality: %s", preset.Name)

		progressIncrement := 50.0 / float64(len(applicablePresets))
		currentProgress := 30.0 + float64(i)*progressIncrement

		if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, float64(int(currentProgress))); err != nil {
			p.logger.Errorf("Failed to update progress for quality %s: %v", preset.Name, err)
		}

		encodedSegments, err := p.encodeSegmentsWithQuality(segments, preset, videoInfo)
		if err != nil {
			return nil, fmt.Errorf("encoding failed for quality %s: %w", preset.Name, err)
		}

		qualitySegments[preset.Name] = encodedSegments

		qualityInfos = append(qualityInfos, models.InputQualityInfo{
			Resolution: fmt.Sprintf("%dx%d", preset.Resolution[0], preset.Resolution[1]),
			Bitrate:    preset.Bitrate,
			MaxBitrate: int(float64(preset.Bitrate) * 1.5),
			MinBitrate: int(float64(preset.Bitrate) * 0.5),
		})

		if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, float64(int(currentProgress+progressIncrement))); err != nil {
			p.logger.Errorf("Failed to update progress after encoding quality %s: %v", preset.Name, err)
		}
	}

	outputPath := filepath.Join(p.tempDir, "output")
	if err := os.MkdirAll(outputPath, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	if err := p.stitchAndPackageMultiQuality(qualitySegments, outputPath); err != nil {
		return nil, fmt.Errorf("finalization failed: %w", err)
	}

	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("output directory does not exist after processing")
	}

	outputKey := strings.TrimPrefix(job.OutputS3Key, "/")
	outputKey = strings.TrimSuffix(outputKey, "/")

	if err := p.uploadProcessedFiles(ctx, outputPath, outputKey); err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 90); err != nil {
		p.logger.Errorf("Failed to update progress after upload: %v", err)
	}

	result := &ProcessingResult{
		Duration:  videoInfo.Duration,
		Width:     videoInfo.Width,
		Height:    videoInfo.Height,
		Qualities: qualityInfos,
	}

	return result, nil
}

func (p *videoProcessor) determineApplicablePresets(videoInfo *VideoInfo) []QualityPreset {
	var applicablePresets []QualityPreset

	sourceWidth := videoInfo.Width
	sourceHeight := videoInfo.Height

	for _, preset := range qualityPresets {
		if preset.Resolution[0] <= sourceWidth && preset.Resolution[1] <= sourceHeight {
			applicablePresets = append(applicablePresets, preset)
		}
	}

	if len(applicablePresets) == 0 {
		applicablePresets = append(applicablePresets, qualityPresets[len(qualityPresets)-1])
	}

	return applicablePresets
}

func (p *videoProcessor) encodeSegmentsWithQuality(segments []string, preset QualityPreset, videoInfo *VideoInfo) ([]string, error) {
	type encodeResult struct {
		index int
		path  string
		err   error
	}

	resultChan := make(chan encodeResult, len(segments))
	sem := make(chan struct{}, MaxParallelJobs)
	var wg sync.WaitGroup

	qualityDir := filepath.Join(p.tempDir, "encoded_segments", string(preset.Name))
	if err := os.MkdirAll(qualityDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory for quality %s: %w", preset.Name, err)
	}

	for i, segment := range segments {
		wg.Add(1)
		go func(idx int, inputPath string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			outputPath := filepath.Join(qualityDir, fmt.Sprintf("encoded_%03d.mp4", idx))
			err := p.encodeSingleSegmentWithQuality(inputPath, outputPath, preset)

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

func (p *videoProcessor) encodeSingleSegmentWithQuality(inputPath, outputPath string, preset QualityPreset) error {

	return p.encodeSingleSegmentWithSVTAV1(inputPath, outputPath, preset)
}

func (p *videoProcessor) encodeSingleSegmentWithH264(inputPath, outputPath string, preset QualityPreset) error {

	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-c:v", "libx264",
		"-preset", "medium",
		"-profile:v", "high",
		"-level", "4.1",
		"-vf", fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1]),

		"-b:v", fmt.Sprintf("%dk", preset.Bitrate),
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.5)),
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2),

		"-g", "48",

		"-movflags", "+faststart",

		"-c:a", "aac",
		"-b:a", "128k",
		"-y", outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("H.264 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func (p *videoProcessor) encodeSingleSegmentWithSVTAV1(inputPath, outputPath string, preset QualityPreset) error {

	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-c:v", "libsvtav1",
		"-preset", "7",
		"-vf", fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1]),

		"-crf", "30",
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.5)),
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2),

		"-g", "240",

		"-movflags", "+faststart",

		"-c:a", "aac",
		"-b:a", "128k",
		"-y", outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("SVT-AV1 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
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

		err := filepath.Walk(outputPath, func(path string, info os.FileInfo, err error) error {
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

	log.Println("inputKey", inputKey)

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

func (p *videoProcessor) stitchAndPackageMultiQuality(qualitySegments map[models.VideoQuality][]string, outputPath string) error {

	packagingDir := filepath.Join(p.tempDir, "packaging")
	if err := os.MkdirAll(packagingDir, 0755); err != nil {
		return fmt.Errorf("failed to create packaging directory: %w", err)
	}

	fragmentPaths := []string{}
	for quality, segments := range qualitySegments {
		qualityOutputPath := filepath.Join(outputPath, string(quality))
		if err := os.MkdirAll(qualityOutputPath, 0755); err != nil {
			return fmt.Errorf("failed to create output directory for quality %s: %w", quality, err)
		}

		stitchedPath := filepath.Join(packagingDir, fmt.Sprintf("stitched_%s.mp4", quality))
		if err := p.stitchSegmentsToFile(segments, stitchedPath); err != nil {
			return fmt.Errorf("failed to stitch segments for quality %s: %w", quality, err)
		}

		fragmentedPath := filepath.Join(packagingDir, fmt.Sprintf("fragmented_%s.mp4", quality))
		if err := p.fragmentVideo(stitchedPath, fragmentedPath); err != nil {
			return fmt.Errorf("failed to fragment video for quality %s: %w", quality, err)
		}

		fragmentPaths = append(fragmentPaths, fragmentedPath)

	}

	opts := stitchAndPackageOptions{
		segmentDuration: 6,
		withHLS:         true,
		withDASH:        true,
	}

	log.Println("fragmentPaths", fragmentPaths)

	if err := p.packageVideo(fragmentPaths, outputPath, opts); err != nil {
		return fmt.Errorf("failed to package video: %w", err)
	}

	return nil
}

func (p *videoProcessor) createMasterPlaylist(outputPath string, qualitySegments map[models.VideoQuality][]string) error {
	masterPlaylistPath := filepath.Join(outputPath, "master.m3u8")
	file, err := os.Create(masterPlaylistPath)
	if err != nil {
		return fmt.Errorf("failed to create master playlist: %w", err)
	}
	defer file.Close()

	if _, err := file.WriteString("#EXTM3U\n#EXT-X-VERSION:3\n"); err != nil {
		return fmt.Errorf("failed to write to master playlist: %w", err)
	}

	qualityOrder := []models.VideoQuality{
		models.Quality1080P,
		models.Quality720P,
		models.Quality480P,
		models.Quality360P,
	}

	for _, quality := range qualityOrder {
		if _, exists := qualitySegments[quality]; !exists {
			continue
		}

		var bandwidth int
		var resolution string

		switch quality {
		case models.Quality1080P:
			bandwidth = 4500000
			resolution = "1920x1080"
		case models.Quality720P:
			bandwidth = 2500000
			resolution = "1280x720"
		case models.Quality480P:
			bandwidth = 1000000
			resolution = "854x480"
		case models.Quality360P:
			bandwidth = 600000
			resolution = "640x360"
		}

		streamInfo := fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"av01.0.08M.08.0.110.01.01.01.0,mp4a.40.2\",FRAME-RATE=30\n",
			bandwidth, resolution)
		if _, err := file.WriteString(streamInfo); err != nil {
			return fmt.Errorf("failed to write stream info to master playlist: %w", err)
		}

		variantPath := fmt.Sprintf("%s/master.m3u8\n", quality)
		if _, err := file.WriteString(variantPath); err != nil {
			return fmt.Errorf("failed to write variant path to master playlist: %w", err)
		}
	}

	return nil
}

func (p *videoProcessor) stitchSegmentsToFile(segments []string, outputPath string) error {

	concatListPath := filepath.Join(p.tempDir, "concat_list.txt")
	concatFile, err := os.Create(concatListPath)
	if err != nil {
		return fmt.Errorf("failed to create concat list: %w", err)
	}
	defer os.Remove(concatListPath)
	defer concatFile.Close()

	for _, segment := range segments {
		absPath, err := filepath.Abs(segment)
		if err != nil {
			return fmt.Errorf("failed to get absolute path for segment: %w", err)
		}
		if _, err := fmt.Fprintf(concatFile, "file '%s'\n", absPath); err != nil {
			return fmt.Errorf("failed to write to concat list: %w", err)
		}
	}
	concatFile.Close()

	cmd := exec.Command("ffmpeg",
		"-f", "concat",
		"-safe", "0",
		"-i", concatListPath,
		"-c", "copy",
		"-movflags", "+faststart",
		"-y", outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg concat failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
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
