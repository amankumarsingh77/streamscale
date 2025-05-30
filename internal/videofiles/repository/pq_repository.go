package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type videoRepo struct {
	db *sqlx.DB
}

func NewVideoRepo(db *sqlx.DB) videofiles.Repository {
	return &videoRepo{
		db: db,
	}
}

func (v *videoRepo) CreateVideo(ctx context.Context, videoFile *models.VideoFile) (*models.VideoFile, error) {
	video := &models.VideoFile{}
	if err := v.db.QueryRowxContext(
		ctx,
		createVideoQuery,
		videoFile.UserID,
		videoFile.FileName,
		videoFile.FileSize,
		videoFile.Duration,
		videoFile.Progress,
		videoFile.S3Key,
		videoFile.Status,
		videoFile.S3Bucket,
		videoFile.Format,
	).StructScan(video); err != nil {
		return nil, fmt.Errorf("failed to create video: %w", err)
	}
	return video, nil
}

func (v *videoRepo) GetVideos(ctx context.Context, userID uuid.UUID, query *utils.Pagination) (*models.VideoList, error) {
	var totalCount int
	if err := v.db.GetContext(
		ctx,
		&totalCount,
		getTotalVideosByUserIDQuery,
		userID,
	); err != nil {
		return nil, fmt.Errorf("failed to get total videos count: %w", err)
	}
	if totalCount == 0 {
		return &models.VideoList{
			Videos:     make([]*models.VideoFile, 0),
			TotalCount: 0,
			Page:       0,
			PageSize:   0,
			HasMore:    utils.GetHasMore(query.GetPage(), totalCount, query.GetSize()),
		}, nil
	}
	rows, err := v.db.QueryxContext(
		ctx,
		getVideosByUserIDQuery,
		userID,
		query.GetOffset(),
		query.GetLimit(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get videos by user id: %w", err)
	}
	defer rows.Close()
	var videos = make([]*models.VideoFile, 0, query.GetSize())
	for rows.Next() {
		var video models.VideoFile
		if err = rows.StructScan(&video); err != nil {
			return nil, fmt.Errorf("failed to scan video: %w", err)
		}
		videos = append(videos, &video)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan videos: %w", err)
	}
	return &models.VideoList{
		Videos:     videos,
		TotalCount: utils.GetTotalPages(totalCount, query.GetSize()),
		Page:       query.GetPage(),
		PageSize:   query.GetSize(),
		HasMore:    utils.GetHasMore(query.GetPage(), totalCount, query.GetSize()),
	}, nil

}

func (v *videoRepo) GetVideoByID(ctx context.Context, videoID uuid.UUID) (*models.VideoFile, error) {
	video := &models.VideoFile{}
	if err := v.db.QueryRowxContext(
		ctx,
		getVideoByIDQuery,
		videoID,
	).StructScan(video); err != nil {
		return nil, fmt.Errorf("failed to get video by id: %w", err)
	}
	log.Println("video", video)
	return video, nil
}

func (v *videoRepo) UpdateVideo(ctx context.Context, video *models.VideoFile) (*models.VideoFile, error) {
	videoFile := &models.VideoFile{}
	if err := v.db.GetContext(
		ctx,
		videoFile,
		updateVideoQuery,
		&video.FileName,
		&video.FileSize,
		&video.Duration,
		&video.S3Key,
		&video.S3Bucket,
		&video.Format,
		&video.Status,
	); err != nil {
		return nil, fmt.Errorf("failed to update video: %w", err)
	}
	return videoFile, nil
}

func (v *videoRepo) GetVideosByQuery(ctx context.Context, userID uuid.UUID, query string, pq *utils.Pagination) (*models.VideoList, error) {
	var totalCount int
	if err := v.db.GetContext(
		ctx,
		&totalCount,
		getTotalVideosCountQuery,
		userID,
		query,
	); err != nil {
		return nil, fmt.Errorf("failed to get total videos by query: %w", err)
	}
	if totalCount == 0 {
		return &models.VideoList{
			Videos:     make([]*models.VideoFile, 0),
			TotalCount: 0,
			Page:       0,
			PageSize:   0,
			HasMore:    utils.GetHasMore(pq.GetPage(), totalCount, pq.GetSize()),
		}, nil
	}
	rows, err := v.db.QueryxContext(
		ctx,
		getVideosBySearchQuery,
		userID,
		query,
		pq.GetOffset(),
		pq.GetLimit(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get videos by query: %w", err)
	}
	defer rows.Close()
	var videos = make([]*models.VideoFile, 0, pq.GetSize())
	for rows.Next() {
		var video models.VideoFile
		if err = rows.StructScan(&video); err != nil {
			return nil, fmt.Errorf("failed to scan video: %w", err)
		}
		videos = append(videos, &video)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan videos: %w", err)
	}
	return &models.VideoList{
		Videos:     videos,
		TotalCount: utils.GetTotalPages(totalCount, pq.GetSize()),
		Page:       pq.GetPage(),
		PageSize:   pq.GetSize(),
		HasMore:    utils.GetHasMore(pq.GetPage(), totalCount, pq.GetSize()),
	}, nil
}

func (v *videoRepo) DeleteVideo(ctx context.Context, userID uuid.UUID, videoID uuid.UUID) error {
	res, err := v.db.ExecContext(
		ctx,
		deleteVideoQuery,
		videoID,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete video: %w", err)
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		return fmt.Errorf("no video found to delete")
	}
	return nil
}

func (v *videoRepo) GetPlaybackInfo(ctx context.Context, videoID uuid.UUID) (*models.PlaybackInfo, error) {
	query := `
		SELECT
			video_id, title, duration, thumbnail,
			COALESCE(qualities::text, '{}') as qualities,
			COALESCE(subtitles, ARRAY[]::text[]) as subtitles,
			format, status, error_message,
			created_at, updated_at
		FROM playback_info
		WHERE video_id = $1`

	var result struct {
		VideoID      string                `db:"video_id"`
		Title        string                `db:"title"`
		Duration     float64               `db:"duration"`
		Thumbnail    string                `db:"thumbnail"`
		QualitiesRaw string                `db:"qualities"`
		Subtitles    pq.StringArray        `db:"subtitles"`
		Format       models.PlaybackFormat `db:"format"`
		Status       models.JobStatus      `db:"status"`
		ErrorMessage string                `db:"error_message"`
		CreatedAt    time.Time             `db:"created_at"`
		UpdatedAt    time.Time             `db:"updated_at"`
	}

	if err := v.db.QueryRowxContext(ctx, query, videoID).StructScan(&result); err != nil {
		return nil, fmt.Errorf("failed to get playback info: %w", err)
	}

	playbackInfo := &models.PlaybackInfo{
		VideoID:      result.VideoID,
		Title:        result.Title,
		Duration:     result.Duration,
		Thumbnail:    result.Thumbnail,
		Qualities:    make(map[models.VideoQuality]models.QualityInfo),
		Subtitles:    []string(result.Subtitles),
		Format:       result.Format,
		Status:       result.Status,
		ErrorMessage: result.ErrorMessage,
		CreatedAt:    result.CreatedAt,
		UpdatedAt:    result.UpdatedAt,
	}

	// Unmarshal qualities
	if err := json.Unmarshal([]byte(result.QualitiesRaw), &playbackInfo.Qualities); err != nil {
		return nil, fmt.Errorf("failed to unmarshal qualities: %w", err)
	}

	return playbackInfo, nil
}

func (v *videoRepo) CreatePlaybackInfo(ctx context.Context, videoID uuid.UUID, info *models.PlaybackInfo) error {
	query := `
		INSERT INTO playback_info (
			video_id, title, duration, thumbnail, qualities, subtitles, format, status, error_message,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		)
		ON CONFLICT (video_id) DO UPDATE SET
			title = EXCLUDED.title,
			duration = EXCLUDED.duration,
			thumbnail = EXCLUDED.thumbnail,
			qualities = EXCLUDED.qualities,
			subtitles = EXCLUDED.subtitles,
			format = EXCLUDED.format,
			status = EXCLUDED.status,
			error_message = EXCLUDED.error_message,
			updated_at = CURRENT_TIMESTAMP
	`

	qualitiesJSON, err := json.Marshal(info.Qualities)
	if err != nil {
		return fmt.Errorf("failed to marshal qualities: %w", err)
	}

	_, err = v.db.ExecContext(ctx, query,
		videoID,
		info.Title,
		info.Duration,
		info.Thumbnail,
		qualitiesJSON,
		pq.Array(info.Subtitles),
		info.Format,
		info.Status,
		info.ErrorMessage,
	)
	if err != nil {
		return fmt.Errorf("failed to create/update playback info: %w", err)
	}

	return nil
}

func (v *videoRepo) UpdateVideoProgress(ctx context.Context, videoID uuid.UUID, status models.JobStatus, progress float64) error {
	query := `
		UPDATE video_files
		SET progress = $1, status = $2, updated_at = CURRENT_TIMESTAMP
		WHERE video_id = $3
		RETURNING video_id`

	var id uuid.UUID
	if err := v.db.QueryRowContext(ctx, query, progress, status, videoID).Scan(&id); err != nil {
		return fmt.Errorf("failed to update video progress and status: %w", err)
	}
	return nil
}
