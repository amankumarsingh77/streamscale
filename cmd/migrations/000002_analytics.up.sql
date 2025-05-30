-- Create analytics tables

-- Table for tracking video views
CREATE TABLE video_views (
    id SERIAL PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES video_files(video_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER DEFAULT 0 -- Duration watched in seconds
);

-- Create indexes for video_views
CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_video_views_user_id ON video_views(user_id);
CREATE INDEX idx_video_views_timestamp ON video_views(timestamp);

-- Table for tracking video watch sessions
CREATE TABLE video_watch_sessions (
    id SERIAL PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES video_files(video_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    session_id VARCHAR(64) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    watch_duration INTEGER NOT NULL, -- Duration watched in seconds
    completed BOOLEAN DEFAULT FALSE
);

-- Create indexes for video_watch_sessions
CREATE INDEX idx_video_watch_sessions_video_id ON video_watch_sessions(video_id);
CREATE INDEX idx_video_watch_sessions_user_id ON video_watch_sessions(user_id);
CREATE INDEX idx_video_watch_sessions_session_id ON video_watch_sessions(session_id);
CREATE INDEX idx_video_watch_sessions_start_time ON video_watch_sessions(start_time);

-- Table for storing aggregated video engagement metrics
CREATE TABLE video_engagement (
    video_id UUID PRIMARY KEY REFERENCES video_files(video_id) ON DELETE CASCADE,
    total_views BIGINT DEFAULT 0,
    unique_views BIGINT DEFAULT 0,
    total_watch_time BIGINT DEFAULT 0, -- Total watch time in seconds
    avg_watch_time DECIMAL(10, 2) DEFAULT 0, -- Average watch time in seconds
    completion_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage of views that completed the video
    engagement_score DECIMAL(5, 2) DEFAULT 0, -- Calculated engagement score
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a view for video performance metrics
CREATE VIEW video_performance AS
SELECT 
    v.video_id,
    p.title,
    p.duration,
    e.total_views,
    e.unique_views,
    e.total_watch_time,
    e.avg_watch_time,
    e.completion_rate,
    e.engagement_score,
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
    video_engagement e ON v.video_id = e.video_id;
