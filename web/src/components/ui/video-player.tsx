import "@vidstack/react/player/styles/default/theme.css";
import { useEffect, useRef, useState } from "react";
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaCanPlayDetail,
  type MediaCanPlayEvent,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type MediaProviderChangeEvent,
  type MediaViewType,
} from "@vidstack/react";
import { VideoLayout } from "../player/layouts/video-layout";

interface PlaybackQuality {
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
  qualities: {
    [key: string]: PlaybackQuality;
  };
  subtitles: string[];
  format: string;
  status: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

interface VideoPlayerProps {
  playbackInfo: PlaybackInfo;
  className?: string;
}

export function VideoPlayer({ playbackInfo, className = "" }: VideoPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);
  const [viewType, setViewType] = useState<MediaViewType>("unknown");
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentSrc, setCurrentSrc] = useState<string>("");

  // Get the HLS URL from the highest quality available
  const getPlaybackUrl = () => {
    const qualities = Object.values(playbackInfo.qualities);
    if (qualities.length === 0) return "";

    // First check if "master" quality exists
    console.log(playbackInfo.qualities);
    const masterQuality = playbackInfo.qualities["master"];
    if (masterQuality && masterQuality.urls.hls) {
      return masterQuality.urls.hls;
    }

    // If no master quality, sort by resolution and return the highest
    // Sort by resolution (assuming resolution is in format "1080p", "720p", etc.)
    const sortedQualities = qualities.sort((a, b) => {
      const aRes = parseInt(a.resolution);
      const bRes = parseInt(b.resolution);
      return bRes - aRes;
    });

    return sortedQualities[0].urls.hls;
  };

  // Get quality URL based on selected quality
  const getQualityUrl = (quality: string) => {
    if (quality === "auto") {
      return getPlaybackUrl();
    }
    
    const qualityObj = playbackInfo.qualities[quality];
    return qualityObj?.urls.hls || getPlaybackUrl();
  };

  // Change playback quality
  const changeQuality = (quality: string) => {
    if (quality === selectedQuality) return;
    
    // Store current playback state
    let currentTime = 0;
    let isPaused = true;
    
    if (player.current) {
      currentTime = player.current.currentTime;
      isPaused = player.current.paused;
    }
    
    // Update the selected quality state
    setSelectedQuality(quality);
    
    // Update the source URL state which will trigger a re-render of the MediaPlayer
    const newSrc = getQualityUrl(quality);
    setCurrentSrc(newSrc);
    
    // After the source changes and media loads, restore playback state
    if (player.current) {
      const handleLoadedMetadata = () => {
        if (player.current) {
          player.current.currentTime = currentTime;
          if (!isPaused) {
            player.current.play().catch(error => {
              console.error("Error playing video after quality change:", error);
            });
          }
        }
      };
      
      player.current.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    }
  };

  // Change playback speed
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    
    if (player.current) {
      player.current.playbackRate = speed;
    }
  };

  useEffect(() => {
    // Subscribe to state updates.
    return player.current!.subscribe(({ viewType }) => {
      setViewType(viewType);
    });
  }, []);

  // Set up available qualities
  useEffect(() => {
    const qualities = Object.keys(playbackInfo.qualities);
    // Add "auto" option and filter out "master"
    const filteredQualities = ["auto", ...qualities.filter(q => q !== "master")];
    setAvailableQualities(filteredQualities);
    
    // Initialize current source
    setCurrentSrc(getPlaybackUrl());
  }, [playbackInfo]);

  // Set initial playback speed when player is ready
  useEffect(() => {
    if (player.current) {
      player.current.playbackRate = playbackSpeed;
    }
  }, [player.current, playbackSpeed]);

  function onProviderChange(
    provider: MediaProviderAdapter | null,
    nativeEvent: MediaProviderChangeEvent
  ) {
    // Configure HLS provider
    if (isHLSProvider(provider)) {
      provider.config = {
        // Add any HLS.js config options if needed
        autoStartLoad: true,
        enableWorker: true,
      };
    }
  }

  function onCanPlay(
    detail: MediaCanPlayDetail,
    nativeEvent: MediaCanPlayEvent
  ) {
    console.log("Video can play");
  }

  const playbackUrl = getPlaybackUrl();

  if (!playbackUrl) {
    return <div>No playback URL available</div>;
  }

  return (
    <MediaPlayer
      className="w-full aspect-video bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4"
      src={currentSrc || getQualityUrl(selectedQuality)}
      crossOrigin
      playsInline
      onProviderChange={onProviderChange}
      onCanPlay={onCanPlay}
      ref={player}
    >
      <MediaProvider>
        {playbackInfo.thumbnail && (
          <Poster
            className="absolute inset-0 block h-full w-full rounded-md opacity-0 transition-opacity data-[visible]:opacity-100 object-cover"
            src={playbackInfo.thumbnail}
            alt={playbackInfo.title}
          />
        )}
      </MediaProvider>

      <VideoLayout 
        thumbnails="" 
        qualities={availableQualities}
        selectedQuality={selectedQuality}
        onQualityChange={changeQuality}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={changePlaybackSpeed}
      />
    </MediaPlayer>
  );
}
