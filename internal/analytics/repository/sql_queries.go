package repository

// SQL queries for analytics repository

const (
	// Video engagement queries
	updateVideoEngagementQuery = `
		INSERT INTO video_engagement (
			video_id, total_views, unique_views, total_watch_time, 
			avg_watch_time, completion_rate, engagement_score, last_calculated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (video_id) 
		DO UPDATE SET
			total_views = $2,
			unique_views = $3,
			total_watch_time = $4,
			avg_watch_time = $5,
			completion_rate = $6,
			engagement_score = $7,
			last_calculated_at = $8
	`

	getVideoEngagementQuery = `
		SELECT 
			video_id, total_views, unique_views, total_watch_time, 
			avg_watch_time, completion_rate, engagement_score, last_calculated_at
		FROM video_engagement
		WHERE video_id = $1
	`

	// Video performance queries
	getVideoPerformanceQuery = `
		SELECT 
			v.video_id, p.title, p.duration, e.total_views, e.unique_views,
			e.total_watch_time, e.avg_watch_time, e.completion_rate, e.engagement_score,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS views_last_7_days,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS views_last_30_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS watch_time_last_7_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS watch_time_last_30_days,
			p.thumbnail AS thumbnail_url,
			v.uploaded_at AS created_at
		FROM 
			video_files v
		JOIN 
			playback_info p ON v.video_id = p.video_id
		LEFT JOIN 
			video_engagement e ON v.video_id = e.video_id
		WHERE v.video_id = $1
	`

	getTopPerformingVideosQuery = `
		SELECT 
			v.video_id, p.title, p.duration, e.total_views, e.unique_views,
			e.total_watch_time, e.avg_watch_time, e.completion_rate, e.engagement_score,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS views_last_7_days,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS views_last_30_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS watch_time_last_7_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS watch_time_last_30_days,
			p.thumbnail AS thumbnail_url,
			v.uploaded_at AS created_at
		FROM 
			video_files v
		JOIN 
			playback_info p ON v.video_id = p.video_id
		LEFT JOIN 
			video_engagement e ON v.video_id = e.video_id
		WHERE v.user_id = $1
		ORDER BY e.engagement_score DESC, e.total_views DESC
		LIMIT $2
	`

	getRecentVideosQuery = `
		SELECT 
			v.video_id, p.title, p.duration, e.total_views, e.unique_views,
			e.total_watch_time, e.avg_watch_time, e.completion_rate, e.engagement_score,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS views_last_7_days,
			(SELECT COUNT(*) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS views_last_30_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '7 days') AS watch_time_last_7_days,
			(SELECT COALESCE(SUM(duration), 0) FROM video_views 
			 WHERE video_id = v.video_id AND timestamp > NOW() - INTERVAL '30 days') AS watch_time_last_30_days,
			p.thumbnail AS thumbnail_url,
			v.uploaded_at AS created_at
		FROM 
			video_files v
		JOIN 
			playback_info p ON v.video_id = p.video_id
		LEFT JOIN 
			video_engagement e ON v.video_id = e.video_id
		WHERE v.user_id = $1
		ORDER BY v.uploaded_at DESC
		LIMIT $2
	`

	// Summary metrics queries
	getTotalVideosQuery = `
		SELECT COUNT(*) 
		FROM video_files
		WHERE user_id = $1
	`

	getTotalWatchTimeQuery = `
		SELECT COALESCE(SUM(vv.duration), 0)
		FROM video_views vv
		JOIN video_files vf ON vv.video_id = vf.video_id
		WHERE vf.user_id = $1
	`
)
