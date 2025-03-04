import { api } from './api';

export type VideoQuality = '1080p' | '720p' | '480p' | '360p';
export type PlaybackFormat = 'hls' | 'dash';
export type JobStatus = 'processing' | 'completed' | 'failed' | 'queued' ;

export interface QualityInfo {
  urls: {
    hls: string;
    dash: string;
  };
  resolution: string;
  bitrate: number;
}

export interface PlaybackInfo {
  video_id: string;
  title: string;
  duration: number;
  thumbnail: string;
  qualities: Record<VideoQuality, QualityInfo>;
  subtitles: string[];
  format: PlaybackFormat;
  status: JobStatus;
}

export interface VideoFile {
  video_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  duration: number;
  s3_key: string;
  progress: number;
  status: JobStatus;
  s3_bucket: string;
  format: string;
  uploaded_at: string;
  updated_at: string;
  playback_info?: PlaybackInfo;
}

export interface VideoList {
  videos: VideoFile[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface VideoUploadInput {
  name: string;
  mime_type: string;
  size: number;
}

export interface CreateJobInput {
  filename: string;
  file_size: number;
  duration: number;
  format: string;
  qualities: Array<{
    resolution: string;
    bitrate: number;
  }>;
  output_formats: string[];
  enable_per_title_encoding: boolean;
}

export const videoApi = {
  // Get pre-signed URL for upload
  getUploadUrl: async (input: VideoUploadInput) => {
    const response = await api.post('video/get-upload-url', input);
    return response.data as { 
      presignUrl: string;
    };
  },

  // Upload video metadata after S3 upload
  confirmUpload: async (videoData: {
    s3_key: string;
    filename: string;
    file_size: number;
    format: string;
    duration: number;
  }) => {
    const response = await api.post('/video/upload', videoData);
    return response.data as VideoFile;
  },

  // Create transcoding job
  createJob: async (input: CreateJobInput) => {
    const response = await api.post('/video/create-job', input);
    return response.data;
  },

  // Get single video details
  getVideo: async (videoId: string) => {
    const response = await api.get(`/video/${videoId}`);
    return response.data as VideoFile;
  },

  // List all videos
  listVideos: async (page: number = 1, limit: number = 10) => {
    const response = await api.get('/video/list-videos', {
      params: { page, limit },
    });
    return response.data as VideoList;
  },

  // Search videos
  searchVideos: async (query: string, page: number = 1, limit: number = 10) => {
    const response = await api.get('/video/search', {
      params: { 
        query: query, 
        page, 
        limit,
        partial_match: true  // Enable partial matching
      },
    });
    return response.data as VideoList;
  },

  // Delete video
  deleteVideo: async (videoId: string) => {
    await api.delete(`/video/${videoId}`);
  },

  // Update video metadata
  updateVideo: async (videoId: string, data: {
    title?: string;
    description?: string;
  }) => {
    const response = await api.put(`/${videoId}`, data);
    return response.data as VideoFile;
  },

  // Get video playback information
  getPlaybackInfo: async (videoId: string) => {
    const response = await api.get(`/video/${videoId}/playback-info`);
    return response.data as PlaybackInfo;
  },
}; 