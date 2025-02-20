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

  // Get the HLS URL from the highest quality available
  const getPlaybackUrl = () => {
    const qualities = Object.values(playbackInfo.qualities);
    if (qualities.length === 0) return "";

    // Sort by resolution (assuming resolution is in format "1080p", "720p", etc.)
    const sortedQualities = qualities.sort((a, b) => {
      const aRes = parseInt(a.resolution);
      const bRes = parseInt(b.resolution);
      return bRes - aRes;
    });

    // Return the HLS URL of the highest quality
    return sortedQualities[0].urls.hls;
  };

  useEffect(() => {
    // Subscribe to state updates.
    return player.current!.subscribe(({ viewType }) => {
      setViewType(viewType);
    });
  }, []);

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
      src={playbackUrl}
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

      <VideoLayout thumbnails="" />
    </MediaPlayer>
  );
}
