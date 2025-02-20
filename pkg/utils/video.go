package utils

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"time"
)

func GetDefaultMinBitrate(resolution string) int {
	switch resolution {
	case "2160p", "4K":
		return 8000
	case "1440p", "2K":
		return 5000
	case "1080p":
		return 3000
	case "720p":
		return 1500
	case "480p":
		return 500
	case "360p":
		return 300
	default:
		return 500
	}
}

func GetDefaultMaxBitrate(resolution string) int {
	switch resolution {
	case "2160p", "4K":
		return 40000
	case "1440p", "2K":
		return 16000
	case "1080p":
		return 8000
	case "720p":
		return 4000
	case "480p":
		return 2000
	case "360p":
		return 1000
	default:
		return 2000
	}
}

func AdjustBitrateToRange(bitrate, minBitrate, maxBitrate int) int {
	if bitrate < minBitrate {
		return minBitrate
	}
	if bitrate > maxBitrate {
		return maxBitrate
	}
	return bitrate
}

func GetDefaultQualities() []models.InputQualityInfo {
	return []models.InputQualityInfo{
		{
			Resolution: "720p",
			Bitrate:    2500,
			MinBitrate: 1500,
			MaxBitrate: 3000,
		},
		{
			Resolution: "480p",
			Bitrate:    1000,
			MinBitrate: 500,
			MaxBitrate: 2000,
		},
	}
}

func ValidateDate(date string) error {
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return err
	}
	return nil
}
