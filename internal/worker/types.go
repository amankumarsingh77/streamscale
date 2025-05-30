package worker

import (
	"context"
	"runtime"
	"sync"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/google/uuid"
)

const (
	VideoJobsQueueKey      = "video_jobs"
	TempDir                = "tmp_segments"
	MinSegmentDuration     = 10
	MaxSegments            = 16
	DefaultBaseBitrate     = 400
	HDBaseBitrate          = 800
	FullHDBaseBitrate      = 1500
	MaxConcurrentUploads   = 50
	MaxConcurrentDownloads = 10
	MaxIOWorkers           = 32
)

type Worker struct {
	logger    logger.Logger
	redisRepo videofiles.RedisRepository
	awsRepo   videofiles.AWSRepository
	videoRepo videofiles.Repository
	cfg       *config.Config
	stopChan  chan struct{}
	wg        sync.WaitGroup
	jobs      chan *models.EncodeJob
	semaphore chan struct{}
}

type VideoInfo struct {
	Width    int
	Height   int
	Duration float64
}

type VideoProcessor interface {
	ProcessVideo(ctx context.Context, job *models.EncodeJob, videoID uuid.UUID) (*ProcessingResult, error)
}

func GetOptimalParallelJobs() int {
	cores := runtime.NumCPU()
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	availableMemoryGB := float64(memStats.Sys) / (1024 * 1024 * 1024)

	memoryBasedLimit := int(availableMemoryGB / 1.5)
	if memoryBasedLimit < cores {
		memoryBasedLimit = cores
	}

	aggressiveLimit := cores
	switch {
	case cores >= 32:
		aggressiveLimit = cores + 4
	case cores >= 16:
		aggressiveLimit = cores + 2
	case cores >= 8:
		aggressiveLimit = cores + 1
	case cores >= 4:
		aggressiveLimit = cores * 2
	default:
		aggressiveLimit = 4
	}

	if memoryBasedLimit < aggressiveLimit {
		return memoryBasedLimit
	}
	return aggressiveLimit
}

func GetMaxConcurrentEncoders() int {
	cores := runtime.NumCPU()
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	availableMemoryGB := float64(memStats.Sys) / (1024 * 1024 * 1024)

	memoryBasedLimit := int(availableMemoryGB / 2)
	if memoryBasedLimit < 2 {
		memoryBasedLimit = 2
	}

	coreBasedLimit := cores
	switch {
	case cores >= 32:
		coreBasedLimit = cores + 4
	case cores >= 16:
		coreBasedLimit = cores + 2
	case cores >= 8:
		coreBasedLimit = cores
	case cores >= 4:
		coreBasedLimit = cores
	default:
		coreBasedLimit = 4
	}

	if memoryBasedLimit < coreBasedLimit {
		return memoryBasedLimit
	}
	return coreBasedLimit
}

func GetOptimalSegmentCount(duration float64) int {
	cores := runtime.NumCPU()
	baseSegments := int(duration / 3)

	switch {
	case cores >= 32:
		return min(baseSegments, cores*3)
	case cores >= 16:
		return min(baseSegments, cores*2)
	case cores >= 8:
		return min(baseSegments, cores+8)
	default:
		return min(baseSegments, 16)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
