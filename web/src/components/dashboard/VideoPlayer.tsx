import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer as Player } from "@/components/ui/video-player";
import { videoApi, VideoFile } from "@/lib/videoApi";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import type { PlaybackInfo } from "@/components/ui/video-player";

export default function VideoPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        const videoData = await videoApi.getVideo(videoId!);
        setVideo(videoData);

        if (videoData.status === 'completed') {
          const playbackData = await videoApi.getPlaybackInfo(videoId!);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <Card className="p-6 bg-black/20 backdrop-blur-xl border-white/10">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Video</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="border-white/10 hover:bg-white/5"
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
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="p-8 bg-black/20 backdrop-blur-xl border-white/10">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-violet-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-3">
              Video Processing
            </h2>
            <p className="text-slate-400 text-lg mb-6 max-w-md">
              Your video is currently being processed. This may take a few minutes depending on the file size.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
                <p className="text-sm font-medium text-slate-400 mb-1">File Name</p>
                <p className="text-white font-semibold tracking-wide truncate">
                  {video.file_name}
                </p>
              </Card>
              <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
                <p className="text-sm font-medium text-slate-400 mb-1">Size</p>
                <p className="text-white font-semibold tracking-wide">
                  {Math.round(video.file_size / (1024 * 1024))} MB
                </p>
              </Card>
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
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard')}
        className="text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
          {video.file_name}
        </h1>

        <Card className="bg-black/40 backdrop-blur-xl border-slate-800 overflow-hidden">
          <Player playbackInfo={playbackInfo} />
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Resolution</p>
            <p className="text-white font-semibold tracking-wide">
              {Object.keys(playbackInfo.qualities)[0]}
            </p>
          </Card>
          <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Size</p>
            <p className="text-white font-semibold tracking-wide">
              {Math.round(video.file_size / (1024 * 1024))} MB
            </p>
          </Card>
          <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Duration</p>
            <p className="text-white font-semibold tracking-wide">
              {Math.floor(playbackInfo.duration / 60)}:{String(Math.floor(playbackInfo.duration % 60)).padStart(2, '0')}
            </p>
          </Card>
          <Card className="p-4 bg-black/20 backdrop-blur-sm border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Uploaded</p>
            <p className="text-white font-semibold tracking-wide">
              {new Date(video.uploaded_at).toLocaleDateString()}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
} 