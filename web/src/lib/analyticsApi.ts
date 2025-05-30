import { api } from './api';
import { VideoFile } from './videoApi';

// Analytics API Types
export interface VideoView {
  id: number;
  video_id: string;
  user_id?: string;
  ip: string;
  user_agent: string;
  timestamp: string;
  duration: number;
}

export interface VideoWatchSession {
  id: number;
  video_id: string;
  user_id?: string;
  session_id: string;
  start_time: string;
  end_time: string;
  watch_duration: number;
  completed: boolean;
}

export interface VideoEngagement {
  video_id: string;
  total_views: number;
  unique_views: number;
  total_watch_time: number;
  avg_watch_time: number;
  completion_rate: number;
  engagement_score: number;
  last_calculated_at: string;
}

export interface VideoPerformance {
  video_id: string;
  title: string;
  duration: number;
  total_views: number;
  unique_views: number;
  total_watch_time: number;
  avg_watch_time: number;
  completion_rate: number;
  engagement_score: number;
  views_last_7_days: number;
  views_last_30_days: number;
  watch_time_last_7_days: number;
  watch_time_last_30_days: number;
  thumbnail_url: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_videos: number;
  total_views: number;
  total_watch_time: number;
  avg_engagement_score: number;
  recent_videos: VideoPerformance[];
  top_videos: VideoPerformance[];
}

export interface AnalyticsTimeRange {
  start_date?: string;
  end_date?: string;
}

export interface AnalyticsFilter {
  user_id?: string;
  video_id?: string;
  time_range?: AnalyticsTimeRange;
  limit?: number;
  offset?: number;
}

// Analytics API Client
export const analyticsApi = {
  // Get analytics summary
  getAnalyticsSummary: async () => {
    const response = await api.get('/analytics/summary');
    return response.data as AnalyticsSummary;
  },

  // Record a video view
  recordVideoView: async (videoId: string, duration: number) => {
    const response = await api.post('/analytics/views', {
      video_id: videoId,
      duration: duration
    });
    return response.data as VideoView;
  },

  // Get video views
  getVideoViews: async (videoId: string, filter?: AnalyticsFilter) => {
    const response = await api.get(`/analytics/videos/${videoId}/views`, {
      params: {
        start_date: filter?.time_range?.start_date,
        end_date: filter?.time_range?.end_date,
        limit: filter?.limit || 50,
        offset: filter?.offset || 0
      }
    });
    return response.data as VideoView[];
  },

  // Start a watch session
  startWatchSession: async (videoId: string) => {
    const response = await api.post('/analytics/sessions/start', {
      video_id: videoId
    });
    return response.data as VideoWatchSession;
  },

  // End a watch session
  endWatchSession: async (sessionId: string, watchDuration: number, completed: boolean) => {
    const response = await api.post('/analytics/sessions/end', {
      session_id: sessionId,
      watch_duration: watchDuration,
      completed: completed
    });
    return response.data;
  },

  // Get video performance metrics
  getVideoPerformance: async (videoId: string) => {
    const response = await api.get(`/analytics/videos/${videoId}/performance`);
    return response.data as VideoPerformance;
  },

  // Get top performing videos
  getTopPerformingVideos: async (limit: number = 5) => {
    const response = await api.get('/analytics/videos/top', {
      params: { limit }
    });
    return response.data as VideoPerformance[];
  },

  // Get recent videos with performance metrics
  getRecentVideos: async (limit: number = 5) => {
    const response = await api.get('/analytics/videos/recent', {
      params: { limit }
    });
    return response.data as VideoPerformance[];
  },

  // Helper function to format watch time (seconds to hours/minutes)
  formatWatchTime: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  },

  // Helper function to calculate growth percentage
  calculateGrowth: (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
  }
};
