CREATE Type user_role AS ENUM ('admin','user');
CREATE type job_status AS ENUM ('queued','in_progress','completed','failed');

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS CITEXT;

CREATE TABLE users
(
    user_id      UUID PRIMARY KEY                     DEFAULT uuid_generate_v4(),
    fullname     VARCHAR(32)                 NOT NULL CHECK ( fullname <> '' ),
    username     VARCHAR(32)                 NOT NULL CHECK ( username <> '' ),
    email        VARCHAR(64) UNIQUE          NOT NULL CHECK ( email <> '' ),
    password     VARCHAR(250)                NOT NULL CHECK ( octet_length(password) <> 0 ),
    role         user_role                   NOT NULL DEFAULT 'user',
    api_key     VARCHAR(250)                 DEFAULT NULL,
    created_at   TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    storage_quota_db INTEGER                 DEFAULT 100,
    updated_at   TIMESTAMP WITH TIME ZONE             DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE encoding_jobs (
   job_id SERIAL PRIMARY KEY,
   user_id UUID REFERENCES users(user_id),
   video_id UUID REFERENCES video_files(video_id),

   input_s3_key TEXT NOT NULL,         -- S3 key for input video
   input_bucket VARCHAR(255) NOT NULL,  -- S3 bucket name

   output_s3_key TEXT,                       -- Base S3 key for outputs
   output_bucket VARCHAR(255),               -- Output bucket name
   qualities TEXT[] NOT NULL,                -- Array of qualities ['360p', '480p', '720p', '1080p']
   output_formats TEXT[] NOT NULL,           -- Array of formats ['hls', 'dash']
   enable_per_title_encoding BOOLEAN DEFAULT true,

   status job_status DEFAULT 'queued',
   progress INTEGER DEFAULT 0,               -- Progress percentage (0-100)
   error_message TEXT,                       -- Error message if failed

   worker_id VARCHAR(100),                   -- ID of worker processing the job
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_encoding_jobs_user_id ON encoding_jobs(user_id);
CREATE INDEX idx_encoding_jobs_status ON encoding_jobs(status);
CREATE INDEX idx_encoding_jobs_created_at ON encoding_jobs(created_at);
CREATE INDEX idx_encoding_jobs_worker_id ON encoding_jobs(worker_id);


CREATE TABLE video_files (
 video_id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES users(user_id),

 filename VARCHAR(255) NOT NULL,
 file_size BIGINT NOT NULL,
 duration INTEGER,
 status job_status NOT NULL DEFAULT 'uploaded',

 s3_key TEXT NOT NULL,
 s3_bucket VARCHAR(255) NOT NULL,

 format VARCHAR(20),    -- mp4, mov, etc.

 uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE playback_format AS ENUM ('hls', 'dash');
CREATE TABLE playback_info (
   video_id UUID PRIMARY KEY REFERENCES video_files(video_id) ON DELETE CASCADE,
   title VARCHAR(255) NOT NULL,
   duration DECIMAL(10, 3) NOT NULL,
   thumbnail TEXT NOT NULL,
   qualities JSONB NOT NULL DEFAULT '{}'::jsonb,

   subtitles TEXT[] DEFAULT ARRAY[]::TEXT[],
   format playback_format NOT NULL,
   status VARCHAR(20) NOT NULL DEFAULT 'processing',  -- processing, ready, failed
   error_message TEXT,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);