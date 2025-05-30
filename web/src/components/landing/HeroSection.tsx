import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, ArrowRight, Zap } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [comparison, setComparison] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const processedVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Example video URLs - replace with actual demo videos
  const demoVideos = {
    original:
      "https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_1080p_h264.mov", // High bitrate original
    processed:
      "https://pub-c649658f12ac4ce2b225d064b9a211e8.r2.dev/compressed_video.mp4", // Lower bitrate but visually similar
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    document.body.style.userSelect = "none";
    updateComparisonPosition(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.userSelect = "";
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging) {
      updateComparisonPosition(e);
    }
  };

  const updateComparisonPosition = (e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const newComparison = Math.min(Math.max(1, (x / rect.width) * 100), 99);
    setComparison(newComparison);
  };

  useEffect(() => {
    const handleMouseUp = () => handleDragEnd();
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (originalVideoRef.current && processedVideoRef.current) {
      if (isPlaying) {
        Promise.all([
          originalVideoRef.current.play(),
          processedVideoRef.current.play(),
        ]).catch(console.error);
      } else {
        originalVideoRef.current.pause();
        processedVideoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync video times
  useEffect(() => {
    const originalVideo = originalVideoRef.current;
    const processedVideo = processedVideoRef.current;

    if (!originalVideo || !processedVideo) return;

    const syncVideos = () => {
      if (
        Math.abs(originalVideo.currentTime - processedVideo.currentTime) > 0.1
      ) {
        processedVideo.currentTime = originalVideo.currentTime;
      }
    };

    originalVideo.addEventListener("timeupdate", syncVideos);
    originalVideo.addEventListener("seeking", syncVideos);
    originalVideo.addEventListener("seeked", syncVideos);

    return () => {
      originalVideo.removeEventListener("timeupdate", syncVideos);
      originalVideo.removeEventListener("seeking", syncVideos);
      originalVideo.removeEventListener("seeked", syncVideos);
    };
  }, []);

  // Load handler to ensure videos start together
  useEffect(() => {
    const originalVideo = originalVideoRef.current;
    const processedVideo = processedVideoRef.current;

    if (!originalVideo || !processedVideo) return;

    const handleLoad = () => {
      if (isPlaying) {
        Promise.all([originalVideo.play(), processedVideo.play()]).catch(
          console.error
        );
      }
    };

    originalVideo.addEventListener("loadedmetadata", handleLoad);
    processedVideo.addEventListener("loadedmetadata", handleLoad);

    return () => {
      originalVideo.removeEventListener("loadedmetadata", handleLoad);
      processedVideo.removeEventListener("loadedmetadata", handleLoad);
    };
  }, [isPlaying]);

  return (
    <div className="relative overflow-hidden bg-black min-h-screen flex flex-col justify-center">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />

      <div className="relative container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-violet-400 mr-2" />
                <span className="text-sm font-medium text-violet-300">
                  Powered by cutting-edge cloud technology
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="text-white">Transform Your Videos with </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  Cloud Power
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                Professional-grade video processing and streaming platform.
                Convert, compress, and deliver your content in stunning quality
                to any device, anywhere.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="bg-violet-600 hover:bg-violet-700 text-lg font-medium tracking-wide"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
                className="border-slate-700 text-lg font-medium tracking-wide"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" /> Pause Demo
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" /> Watch Demo
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right column - Video Demo */}
          <div className="relative">
            {/* Glow Effects */}
            <div className="absolute -inset-4 bg-violet-500/20 rounded-[30px] blur-2xl" />
            <div className="absolute -inset-4 bg-fuchsia-500/20 rounded-[30px] blur-2xl rotate-180" />

            <Card className="relative bg-black/40 backdrop-blur-xl border-slate-800/50 overflow-hidden rounded-2xl shadow-[0_0_50px_-12px] shadow-violet-500/30">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-fuchsia-500/10" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10" />

              <div ref={containerRef} className="relative aspect-video group">
                {/* Original Video */}
                <video
                  ref={originalVideoRef}
                  src={demoVideos.original}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                  autoPlay
                />

                {/* Processed Video with Clip Path */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${Math.max(0, 100 - comparison)}% 0 0)`,
                    willChange: "clip-path",
                  }}
                >
                  <video
                    ref={processedVideoRef}
                    src={demoVideos.processed}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    playsInline
                    autoPlay
                  />
                </div>

                {/* Video Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none" />

                {/* Draggable Divider Line with enhanced glow */}
                <div
                  className="absolute top-0 bottom-0 flex items-center cursor-ew-resize group touch-none"
                  style={{
                    left: `${comparison}%`,
                    transform: "translateX(-50%)",
                  }}
                  onMouseDown={handleDragStart}
                >
                  {/* Line */}
                  <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-80 group-hover:opacity-100 transition-opacity shadow-[0_0_10px] shadow-white/50" />

                  {/* Handle */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white shadow-lg shadow-white/50 transform scale-75 group-hover:scale-100 transition-transform" />
                  </div>
                </div>

                {/* Video Information */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="flex gap-4">
                    {/* Original Video Stats */}
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shadow-lg shadow-black/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                          Original Source
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white">
                              1080P
                            </span>
                            <span className="text-[10px] text-slate-400">
                              •
                            </span>
                            <span className="text-xs text-white">721MB</span>
                          </div>
                          <div className="h-3 w-[1px] bg-white/20" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-white">
                              8.0
                            </span>
                            <span className="text-[10px] uppercase text-slate-400">
                              Mbps
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Processed Video Stats */}
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-violet-500/20 shadow-lg shadow-violet-500/20">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-violet-300 font-medium">
                          Optimized Output
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white">
                              1080P
                            </span>
                            <span className="text-[10px] text-slate-400">
                              •
                            </span>
                            <span className="text-xs text-white">142MB</span>
                          </div>
                          <div className="h-3 w-[1px] bg-white/20" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-white">
                              2.0
                            </span>
                            <span className="text-[10px] uppercase text-slate-400">
                              Mbps
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Stats */}
                  <div className="flex gap-2">
                    <div className="bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-400">
                          90%
                        </span>
                        <span className="text-[10px] text-emerald-300">
                          Smaller
                        </span>
                      </div>
                    </div>
                    <div className="bg-violet-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-violet-500/20 shadow-lg shadow-violet-500/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-violet-400">
                          1080P
                        </span>
                        <span className="text-[10px] text-violet-300">
                          Quality
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
