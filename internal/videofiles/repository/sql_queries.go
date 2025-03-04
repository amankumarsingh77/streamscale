package repository

const (
	createVideoQuery = `INSERT INTO video_files (user_id, file_name, file_size, duration, progress, s3_key, status,  s3_bucket, format) 
					VALUES ($1, $2, $3, NULLIF($4, 0), $5, $6, $7, $8, $9) RETURNING *`
	getVideosByUserIDQuery = `SELECT video_id, user_id, file_name, file_size, duration, s3_key, s3_bucket, format, status, uploaded_at, updated_at FROM video_files
					WHERE user_id = $1 ORDER BY uploaded_at OFFSET $2 LIMIT $3`
	getVideoByIDQuery = `SELECT video_id, user_id, file_name, file_size, duration, s3_key, s3_bucket, format, progress, status, uploaded_at, updated_at FROM video_files
					WHERE video_id = $1`
	getTotalVideosByUserIDQuery = `SELECT COUNT(video_id) FROM video_files WHERE user_id = $1`
	getTotalVideosCountQuery    = `SELECT COUNT(video_id) FROM video_files WHERE user_id = $1 AND file_name ILIKE '%' || $2 || '%'`
	updateVideoQuery            = `UPDATE video_files 
									SET file_name = COALESCE(nullif($1, ''), file_name),
									    file_size = COALESCE(nullif($2, 0), file_size),
									    duration = COALESCE(nullif($3, 0), duration),
									    s3_key = COALESCE(nullif($4, ''), s3_key),
									    s3_bucket = COALESCE(nullif($5, ''), s3_bucket),
									    format = COALESCE(nullif($6, ''), format),
									    status = COALESCE(nullif($7, ''), status)
									WHERE video_id = $8 `
	getVideosBySearchQuery = `SELECT video_id, user_id, file_name, file_size, duration, s3_key, s3_bucket, format, status, uploaded_at, updated_at FROM video_files
					WHERE user_id = $1 AND file_name ILIKE '%' || $2 || '%' ORDER BY uploaded_at OFFSET $3 LIMIT $4`
	deleteVideoQuery     = `DELETE FROM video_files WHERE video_id = $1 AND user_id = $2`
	getPlaybackInfoQuery = `SELECT video_id, title, duration, thumbnail, qualities, subtitles, format, status, error_message, created_at, updated_at 
						FROM playback_info WHERE video_id = $1`
	getStorageUsageQuery = `SELECT user_id, SUM(file_size) as total_size FROM video_files WHERE user_id = $1 GROUP BY user_id`
)
