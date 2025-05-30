import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer as Player } from "@/components/ui/video-player";
import { videoApi, VideoFile } from "@/lib/videoApi";
import { analyticsApi } from "@/lib/analyticsApi";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Calendar,
  FileVideo,
  MonitorPlay,
  Layers,
  HardDrive,
  Eye,
  Share2,
  Download,
  Heart,
  MoreHorizontal,
  Play,
  Loader,
} from "lucide-react";
import type { PlaybackInfo } from "@/components/ui/video-player";
import { motion } from "framer-motion";

export default function VideoPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const watchDurationRef = useRef<number>(0);
  const lastHeartbeatRef = useRef<number>(0);

  // Record a video view when the component mounts
  useEffect(() => {
    const recordView = async () => {
      if (videoId) {
        try {
          await analyticsApi.recordVideoView(videoId, 0); // Initial view with 0 duration
          console.log("Video view recorded");
        } catch (error) {
          console.error("Failed to record video view:", error);
        }
      }
    };

    recordView();
  }, [videoId]);

  // Start a watch session when the video starts playing
  const startWatchSession = async () => {
    if (videoId && !sessionId) {
      try {
        const session = await analyticsApi.startWatchSession(videoId);
        setSessionId(session.session_id);
        setWatchStartTime(Date.now());
        watchDurationRef.current = 0;
        lastHeartbeatRef.current = Date.now();
        console.log("Watch session started:", session.session_id);
      } catch (error) {
        console.error("Failed to start watch session:", error);
      }
    }
  };

  // End the watch session when the component unmounts or when the video ends
  const endWatchSession = async (completed = false) => {
    if (videoId && sessionId && watchStartTime) {
      try {
        // Calculate watch duration in seconds
        const watchDuration = Math.floor(watchDurationRef.current / 1000);

        await analyticsApi.endWatchSession(sessionId, watchDuration, completed);
        console.log("Watch session ended:", {
          sessionId,
          watchDuration,
          completed,
        });

        // Reset session state
        setSessionId(null);
        setWatchStartTime(null);
        watchDurationRef.current = 0;
      } catch (error) {
        console.error("Failed to end watch session:", error);
      }
    }
  };

  // Update watch duration periodically
  useEffect(() => {
    if (sessionId && watchStartTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastHeartbeatRef.current;
        watchDurationRef.current += elapsed;
        lastHeartbeatRef.current = now;
      }, 1000);

      return () => {
        clearInterval(interval);
        // End the session when the component unmounts
        endWatchSession(false);
      };
    }
  }, [sessionId, watchStartTime]);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        const videoData = await videoApi.getVideo(videoId!);
        setVideo(videoData);

        if (videoData.status === "completed") {
          const playbackData = await videoApi.getPlaybackInfo(videoId!);
          setPlaybackInfo({
            ...playbackData,
            error_message: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-24 h-24"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader className="w-8 h-8 text-violet-400 animate-pulse" />
          </div>
        </motion.div>
        <p className="mt-6 text-slate-400 font-medium">
          Loading video player...
        </p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 bg-gradient-to-br from-red-950/40 to-red-900/10 backdrop-blur-xl border border-red-500/20 max-w-md mx-auto shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center mb-6 shadow-lg shadow-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-300 to-red-100">
                Failed to Load Video
              </h2>
              <p className="text-slate-300 mb-6 leading-relaxed">{error}</p>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 text-red-100 px-6 py-2 rounded-full transition-all duration-300 shadow-md shadow-red-950/20"
                aria-label="Back to Dashboard"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (video.status !== "completed") {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white group transition-all duration-300"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-10 bg-gradient-to-br from-violet-950/30 to-fuchsia-950/20 backdrop-blur-xl border border-violet-500/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-70"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl"></div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-8 shadow-lg shadow-violet-500/10 border border-violet-500/20 relative">
                <div className="absolute inset-0 bg-violet-500/5 rounded-2xl animate-pulse"></div>
                <Clock className="w-12 h-12 text-violet-400 animate-spin" />
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-4">
                Video Processing
              </h2>

              <div className="w-16 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full mb-6 opacity-70"></div>

              <p className="text-slate-300 text-lg mb-8 max-w-lg leading-relaxed">
                Your video is currently being processed and optimized for
                streaming. This may take a few minutes depending on the file
                size and complexity.
              </p>

              <div className="w-full max-w-lg mb-8 bg-black/20 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  initial={{ width: "5%" }}
                  animate={{ width: "60%" }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                ></motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                <Card className="p-5 bg-black/30 backdrop-blur-sm border-violet-500/10 hover:border-violet-500/30 transition-all duration-300 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <FileVideo className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-400 mb-1">
                        File Name
                      </p>
                      <p className="text-white font-semibold tracking-wide truncate">
                        {video.file_name}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-black/30 backdrop-blur-sm border-violet-500/10 hover:border-violet-500/30 transition-all duration-300 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-400 mb-1">
                        File Size
                      </p>
                      <p className="text-white font-semibold tracking-wide">
                        {Math.round(video.file_size / (1024 * 1024))} MB
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-black/30 backdrop-blur-sm border-violet-500/10 hover:border-violet-500/30 transition-all duration-300 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-400 mb-1">
                        Uploaded
                      </p>
                      <p className="text-white font-semibold tracking-wide">
                        {new Date(video.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!playbackInfo) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between mb-10"
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="text-slate-400 hover:text-white group transition-all duration-300 hover:bg-violet-500/10 rounded-xl px-4 py-2"
          aria-label="Back to Dashboard"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium">Back to Dashboard</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-violet-500/10 p-3 h-11 w-11 rounded-xl transition-all duration-300 group"
            aria-label="Share Video"
            title="Share Video"
          >
            <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-violet-500/10 p-3 h-11 w-11 rounded-xl transition-all duration-300 group"
            aria-label="Download Video"
            title="Download Video"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-violet-500/10 p-3 h-11 w-11 rounded-xl transition-all duration-300 group"
            aria-label="Like Video"
            title="Like Video"
          >
            <Heart className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-violet-500/10 p-3 h-11 w-11 rounded-xl transition-all duration-300 group"
            aria-label="More Options"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Enhanced Video Title and Metadata */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 mb-3 leading-tight">
              {video.file_name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
                <Eye className="w-4 h-4 text-violet-400" />
                <span className="font-medium">
                  {Math.floor(Math.random() * 1000) + 100} views
                </span>
              </div>
              <div className="flex items-center gap-2 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span className="font-medium">
                  {new Date(video.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              {playbackInfo.subtitles && playbackInfo.subtitles.length > 0 && (
                <div className="flex items-center gap-2 bg-fuchsia-500/10 px-3 py-1.5 rounded-full border border-fuchsia-500/20">
                  <span className="text-xs font-semibold text-fuchsia-400">
                    CC
                  </span>
                  <span className="font-medium">
                    {playbackInfo.subtitles.length} language
                    {playbackInfo.subtitles.length !== 1 ? "s" : ""} available
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Video Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-xl border-violet-500/20 overflow-hidden shadow-2xl rounded-2xl ring-1 ring-violet-500/10 hover:ring-violet-500/20 transition-all duration-500">
            <div className="relative">
              {/* Ambient glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-violet-600/20 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative bg-black/20 rounded-2xl overflow-hidden">
                <Player
                  playbackInfo={playbackInfo}
                  onPlay={() => startWatchSession()}
                  onEnded={() => endWatchSession(true)}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Enhanced Video Information Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-violet-950/40 to-violet-900/20 backdrop-blur-xl border-violet-500/20 hover:border-violet-400/40 transition-all duration-500 shadow-lg rounded-2xl overflow-hidden group hover:shadow-violet-500/10 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-violet-600/20 transition-all duration-300 border border-violet-500/20">
                  <MonitorPlay className="w-6 h-6 text-violet-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-400 mb-1.5">
                    Resolution
                  </p>
                  <p className="text-white font-bold tracking-wide text-lg">
                    {Object.keys(playbackInfo.qualities)[0]}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-6 bg-gradient-to-br from-fuchsia-950/40 to-fuchsia-900/20 backdrop-blur-xl border-fuchsia-500/20 hover:border-fuchsia-400/40 transition-all duration-500 shadow-lg rounded-2xl overflow-hidden group hover:shadow-fuchsia-500/10 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 flex items-center justify-center group-hover:from-fuchsia-500/30 group-hover:to-fuchsia-600/20 transition-all duration-300 border border-fuchsia-500/20">
                  <HardDrive className="w-6 h-6 text-fuchsia-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-400 mb-1.5">
                    File Size
                  </p>
                  <p className="text-white font-bold tracking-wide text-lg">
                    {Math.round(video.file_size / (1024 * 1024))} MB
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6 bg-gradient-to-br from-violet-950/40 to-purple-900/20 backdrop-blur-xl border-violet-500/20 hover:border-violet-400/40 transition-all duration-500 shadow-lg rounded-2xl overflow-hidden group hover:shadow-violet-500/10 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-purple-600/20 transition-all duration-300 border border-violet-500/20">
                  <Clock className="w-6 h-6 text-violet-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-400 mb-1.5">
                    Duration
                  </p>
                  <p className="text-white font-bold tracking-wide text-lg">
                    {Math.floor(playbackInfo.duration / 60)}:
                    {String(Math.floor(playbackInfo.duration % 60)).padStart(
                      2,
                      "0"
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="p-6 bg-gradient-to-br from-fuchsia-950/40 to-pink-900/20 backdrop-blur-xl border-fuchsia-500/20 hover:border-fuchsia-400/40 transition-all duration-500 shadow-lg rounded-2xl overflow-hidden group hover:shadow-fuchsia-500/10 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-600/10 flex items-center justify-center group-hover:from-fuchsia-500/30 group-hover:to-pink-600/20 transition-all duration-300 border border-fuchsia-500/20">
                  <Layers className="w-6 h-6 text-fuchsia-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-400 mb-1.5">
                    Format
                  </p>
                  <p className="text-white font-bold tracking-wide text-lg">
                    {playbackInfo.format.toUpperCase()}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Video Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="p-8 bg-gradient-to-br from-violet-950/30 to-fuchsia-950/20 backdrop-blur-xl border-violet-500/20 shadow-xl rounded-2xl overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-fuchsia-500/10 to-violet-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
                  <Play className="w-5 h-5 text-violet-400" />
                </div>
                Video Information
              </h2>
              <div className="space-y-4">
                <p className="text-slate-300 leading-relaxed text-lg">
                  This video was uploaded on{" "}
                  <span className="text-white font-semibold">
                    {new Date(video.uploaded_at).toLocaleDateString()}
                  </span>{" "}
                  and is available in{" "}
                  <span className="text-violet-400 font-semibold">
                    {Object.keys(playbackInfo.qualities).length} different
                    quality options
                  </span>
                  . The video is encoded in{" "}
                  <span className="text-fuchsia-400 font-semibold">
                    {playbackInfo.format.toUpperCase()} format
                  </span>{" "}
                  for optimal streaming performance.
                </p>
                {playbackInfo.subtitles &&
                  playbackInfo.subtitles.length > 0 && (
                    <p className="text-slate-300 leading-relaxed">
                      <span className="text-fuchsia-400 font-semibold">
                        {playbackInfo.subtitles.length} subtitle language
                        {playbackInfo.subtitles.length !== 1 ? "s" : ""}
                      </span>{" "}
                      {playbackInfo.subtitles.length === 1 ? "is" : "are"}{" "}
                      available for this video. Select your preferred language
                      from the caption menu (CC button) in the video player
                      controls.
                    </p>
                  )}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
