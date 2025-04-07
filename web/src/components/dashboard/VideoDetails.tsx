import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";
import { videoApi, VideoFile } from "@/lib/videoApi";
import type { PlaybackInfo } from "@/components/ui/video-player";
import {
  Download,
  Share2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  VideoIcon,
  SlidersHorizontal,
} from "lucide-react";

export default function VideoDetails() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId) return;

      try {
        setLoading(true);
        const videoData = await videoApi.getVideo(videoId);
        setVideo(videoData);

        if (videoData.status === 'completed') {
          const playbackData = await videoApi.getPlaybackInfo(videoId);
          setPlaybackInfo({
            ...playbackData,
            error_message: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  // Poll for progress updates
  useEffect(() => {
    if (!video || video.status === 'completed') return;

    const pollProgress = async () => {
      try {
        const videoData = await videoApi.getVideo(videoId!);
        setVideo(videoData);


        // If completed, fetch playback info
        if (videoData.status === 'completed') {
          const playbackData = await videoApi.getPlaybackInfo(videoId!);
          setPlaybackInfo({
            ...playbackData,
            error_message: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    };

    const pollInterval = setInterval(pollProgress, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [videoId, video?.status]);

  const handleVideoAction = async (action: string) => {
    if (!video) return;

    switch (action) {
      case "download":
        if (playbackInfo) {
          const qualities = Object.keys(playbackInfo.qualities) as Array<keyof typeof playbackInfo.qualities>;
          const highestQuality = qualities[0];
          const downloadUrl = playbackInfo.qualities[highestQuality].urls.hls;
          window.open(downloadUrl, "_blank");
        }
        break;
      case "share":
        const shareUrl = `${window.location.origin}/videos/${video.video_id}`;
        navigator.clipboard.writeText(shareUrl);
        // You could add a toast notification here
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <Card className="p-6 bg-red-500/10 backdrop-blur-xl border-red-500/20">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Video</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="border-red-500/20 hover:bg-red-500/10"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  if (video.status !== 'completed') {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="text-slate-400 hover:text-white"
          aria-label="Back to Dashboard"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="p-8 bg-black/20 backdrop-blur-xl border-white/10">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-violet-500/10 flex items-center justify-center mb-6">
                <Clock className="w-12 h-12 text-violet-400 animate-spin" />
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Processing Your Video
              </h2>
              <p className="text-slate-400 text-lg max-w-md">
                We're preparing your video for streaming. This process includes:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">Generating Thumbnails</p>
                <p className="text-sm text-slate-400">Creating preview images</p>
              </Card>

              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">Transcoding</p>
                <p className="text-sm text-slate-400">Optimizing for streaming</p>
              </Card>

              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">Quality Optimization</p>
                <p className="text-sm text-slate-400">Creating multiple resolutions</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">File Name</p>
                    <p className="text-white font-semibold tracking-wide truncate">
                      {video.file_name}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">File Size</p>
                    <p className="text-white font-semibold tracking-wide">
                      {Math.round(video.file_size / (1024 * 1024))} MB
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="w-full max-w-md mt-8">
              <div className="h-1.5 w-full bg-violet-500/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {video.progress < 100
                  ? `Processing: ${video.progress}% complete`
                  : 'Processing complete'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!playbackInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 pb-12">
      {/* Header with navigation and actions */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 rounded-full"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 rounded-full px-4"
              onClick={() => handleVideoAction("share")}
              aria-label="Share Video"
              title="Share Video"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white transition-all duration-200 rounded-full px-4"
              onClick={() => handleVideoAction("download")}
              aria-label="Download Video"
              title="Download Video"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Video title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
          {video.file_name}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Video player */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/50 shadow-xl shadow-violet-900/10">
              <VideoPlayer
                playbackInfo={playbackInfo}
                className="aspect-video w-full"
              />
            </div>
          </div>

          {/* Right column - Video details */}
          <div className="space-y-6">
            {/* Video metadata card */}
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-violet-800/20 to-fuchsia-800/20 backdrop-blur-xl border border-violet-500/20 shadow-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center">
                  <VideoIcon className="w-5 h-5 mr-2 text-violet-400" />
                  Video Details
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">Resolution</p>
                    <p className="text-white text-lg font-semibold">
                      {Object.keys(playbackInfo.qualities)[0]}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">Size</p>
                    <p className="text-white text-lg font-semibold">
                      {Math.round(video.file_size / (1024 * 1024))} MB
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">Duration</p>
                    <p className="text-white text-lg font-semibold flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-violet-400" />
                      {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">Uploaded</p>
                    <p className="text-white text-lg font-semibold">
                      {new Date(video.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical details card */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 shadow-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center">
                  <SlidersHorizontal className="w-5 h-5 mr-2 text-violet-400" />
                  Technical Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Video ID</p>
                    <div className="bg-slate-800/50 rounded-lg p-2 overflow-x-auto">
                      <p className="text-violet-300 font-mono text-sm">{video.video_id}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Format</p>
                    <p className="text-white bg-slate-800/50 rounded-lg p-2 inline-block px-3">
                      {playbackInfo.format || 'MP4'}
                    </p>
                  </div>

                  {playbackInfo.subtitles && playbackInfo.subtitles.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1">Subtitles</p>
                      <div className="flex flex-wrap gap-2">
                        {playbackInfo.subtitles.map((subtitle, index) => (
                          <span key={index} className="bg-slate-800/50 text-white rounded-full px-3 py-1 text-sm">
                            {subtitle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Available Qualities</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.keys(playbackInfo.qualities).map((quality, index) => (
                        <span key={index} className="bg-violet-800/30 text-white rounded-full px-3 py-1 text-sm border border-violet-500/20">
                          {quality}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
