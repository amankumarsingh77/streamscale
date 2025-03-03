package models

import (
	"time"
)

type PlaybackFormat string

const (
	FormatHLS  PlaybackFormat = "hls"
	FormatDASH PlaybackFormat = "dash"
)

type VideoQuality string

const (
	Quality1080P  VideoQuality = "1080p"
	Quality720P   VideoQuality = "720p"
	Quality480P   VideoQuality = "480p"
	Quality360P   VideoQuality = "360p"
	QualityMaster VideoQuality = "master"
)

type InputQualityInfo struct {
	Resolution string `json:"resolution"`
	Bitrate    int    `json:"bitrate"`
	MaxBitrate int    `json:"max_bitrate"`
	MinBitrate int    `json:"min_bitrate"`
}

type PlaybackURLs struct {
	HLS  string `json:"hls"`
	DASH string `json:"dash"`
}

type QualityInfo struct {
	URLs       PlaybackURLs `json:"urls"`
	Resolution string       `json:"resolution"`
	Bitrate    int          `json:"bitrate"`
}

type PlaybackInfo struct {
	VideoID      string                       `json:"video_id" db:"video_id" validate:"required"`
	Title        string                       `json:"title" db:"title" validate:"required,lte=255"`
	Duration     float64                      `json:"duration" db:"duration" validate:"omitempty"`
	Thumbnail    string                       `json:"thumbnail" db:"thumbnail" validate:"omitempty"`
	Qualities    map[VideoQuality]QualityInfo `json:"qualities" db:"qualities" validate:"omitempty"`
	Subtitles    []string                     `json:"subtitles" db:"subtitles" validate:"omitempty"`
	Format       PlaybackFormat               `json:"format" db:"format" validate:"omitempty"`
	Status       JobStatus                    `json:"status" db:"status" validate:"omitempty"`
	ErrorMessage string                       `json:"error_message" db:"error_message" validate:"omitempty"`
	CreatedAt    time.Time                    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time                    `json:"updated_at" db:"updated_at"`
}

func (p *PlaybackInfo) GetPlaybackURL(format PlaybackFormat, quality VideoQuality) string {
	// If master quality is requested or available, prioritize it for HLS
	if format == FormatHLS && (quality == QualityMaster || quality == "") {
		if masterInfo, ok := p.Qualities[QualityMaster]; ok {
			return masterInfo.URLs.HLS
		}
	}

	// Otherwise, return the specific quality requested
	if qualityInfo, ok := p.Qualities[quality]; ok {
		switch format {
		case FormatHLS:
			return qualityInfo.URLs.HLS
		case FormatDASH:
			return qualityInfo.URLs.DASH
		}
	}

	// If the specific quality is not available, try to return the master playlist for HLS
	if format == FormatHLS {
		if masterInfo, ok := p.Qualities[QualityMaster]; ok {
			return masterInfo.URLs.HLS
		}
	}

	return ""
}
