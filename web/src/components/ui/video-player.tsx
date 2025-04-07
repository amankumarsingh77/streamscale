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
  const [playerQualities, setPlayerQualities] = useState<string[]>([]);


  const getPlaybackUrl = () => {
    const qualities = Object.values(playbackInfo.qualities);
    if (qualities.length === 0) return "";


    const masterQuality = playbackInfo.qualities["master"];
    if (masterQuality && masterQuality.urls.hls) {
      return masterQuality.urls.hls;
    }



    const sortedQualities = qualities.sort((a, b) => {
      const aRes = parseInt(a.resolution);
      const bRes = parseInt(b.resolution);
      return bRes - aRes;
    });

    return sortedQualities[0].urls.hls;
  };


  const getQualityUrl = (quality: string) => {
    if (quality === "auto") {
      return getPlaybackUrl();
    }

    const qualityObj = playbackInfo.qualities[quality];
    return qualityObj?.urls.hls || getPlaybackUrl();
  };


  const changeQuality = (quality: string) => {
    if (quality === selectedQuality) return;

    let currentTime = 0;
    let isPaused = true;

    if (player.current) {
      currentTime = player.current.currentTime;
      isPaused = player.current.paused;

      if (player.current.qualities && typeof player.current.qualities === "object") {
        try {
          // Use a public method to retrieve qualities safely
          const qualityItems = player.current.qualities.toArray?.() || [];

          if (Array.isArray(qualityItems)) {
            const qualityItem = qualityItems.find(
              (item) => `${item.height}p` === quality || item.height.toString() === quality
            );

            if (qualityItem) {
              qualityItem.selected = true;
              setSelectedQuality(quality);
              return;
            }
          }
        } catch (error) {
          console.error("Error changing quality through player API:", error);
        }
      }
    }

    // If the quality was not changed through the player API, update manually
    setSelectedQuality(quality);

    // Generate a new source URL for the selected quality
    const newSrc = getQualityUrl(quality);
    setCurrentSrc(newSrc);

    if (player.current) {
      const handleLoadedMetadata = () => {
        if (player.current) {
          player.current.currentTime = currentTime;
          if (!isPaused) {
            player.current.play().catch((error) => {
              console.error("Error playing video after quality change:", error);
            });
          }
        }
      };

      // Listen for metadata load event to restore playback position
      player.current.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    }
  };



  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);

    if (player.current) {
      player.current.playbackRate = speed;
    }
  };

  useEffect(() => {

    return player.current!.subscribe(({ viewType }) => {
      setViewType(viewType);
    });
  }, []);


  useEffect(() => {
    console.log(player.current?.qualities)
    const checkPlayerQualities = () => {
      if (player.current?.qualities) {
        try {
          // Use a public method if available (e.g., `toArray()` or `getAvailableQualities()`)
          const qualityItems = player.current.qualities.toArray?.() || [];

          if (Array.isArray(qualityItems)) {
            const extractedQualities = qualityItems.map(item => `${item.height}p`);
            const qualitiesWithAuto = ["auto", ...extractedQualities];

            if (qualitiesWithAuto.length > 1) {
              setPlayerQualities(qualitiesWithAuto);
              return true;
            }
          }
        } catch (error) {
          console.error("Error accessing player qualities:", error);
        }
      }
      return false;
    };



    const hasPlayerQualities = checkPlayerQualities();

    if (!hasPlayerQualities) {

      const qualities = Object.keys(playbackInfo.qualities);

      const filteredQualities = ["auto", ...qualities.filter(q => q !== "master")];
      setAvailableQualities(filteredQualities);
    }


    const intervalId = setInterval(() => {
      const hasQualities = checkPlayerQualities();
      if (hasQualities) {
        clearInterval(intervalId);
      }
    }, 1000);


    setCurrentSrc(getPlaybackUrl());

    return () => clearInterval(intervalId);
  }, [playbackInfo, player.current]);


  useEffect(() => {
    if (playerQualities.length > 0) {

      const validQualities = playerQualities.filter(q => {

        return q === "auto" ||
          /^\d+p$/.test(q) ||
          /^\d+x\d+$/.test(q) ||
          /^(low|medium|high|hd|fullhd|ultrahd|4k)$/i.test(q);
      });


      if (validQualities.length > 0) {

        const updatedQualities = validQualities.includes("auto")
          ? validQualities
          : ["auto", ...validQualities];
        setAvailableQualities(updatedQualities);
      } else {

        const manualQualities = Object.keys(playbackInfo.qualities);
        const filteredManualQualities = ["auto", ...manualQualities.filter(q => q !== "master")];
        setAvailableQualities(filteredManualQualities);
      }
    }
  }, [playerQualities, playbackInfo]);


  useEffect(() => {
    if (player.current) {
      player.current.playbackRate = playbackSpeed;
    }
  }, [player.current, playbackSpeed]);

  function onProviderChange(
    provider: MediaProviderAdapter | null,
    nativeEvent: MediaProviderChangeEvent
  ) {

    if (isHLSProvider(provider)) {
      provider.config = {

        autoStartLoad: true,
        enableWorker: true,
      };
    }
  }

  function onCanPlay(detail: MediaCanPlayDetail, nativeEvent: MediaCanPlayEvent) {
    if (player.current?.qualities) {
      try {
        // Use a public method like `toArray()` instead of accessing `items` directly
        const qualityItems = player.current.qualities.toArray?.() || [];

        if (Array.isArray(qualityItems)) {
          const extractedQualities = qualityItems.map((item) => `${item.height}p`);
          const qualitiesWithAuto = ["auto", ...extractedQualities];

          if (qualitiesWithAuto.length > 1) {
            setPlayerQualities(qualitiesWithAuto);

            // Find the currently selected quality
            const selectedItem = qualityItems.find((item) => item.selected);
            if (selectedItem) {
              setSelectedQuality(`${selectedItem.height}p`);
            }
          }
        }
      } catch (error) {
        console.error("Error accessing player qualities in onCanPlay:", error);
      }
    }
  }


  const playbackUrl = getPlaybackUrl();

  if (!playbackUrl) {
    return <div>No playback URL available</div>;
  }


  const displayQualities = playerQualities.length > 0 ? playerQualities : availableQualities;

  return (
    <MediaPlayer
      className="w-full aspect-video bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4"
      src={currentSrc || getQualityUrl(selectedQuality)}
      crossOrigin
      playsInline
      onProviderChange={onProviderChange}
      onCanPlay={onCanPlay}
      ref={player}
      style={{ maxWidth: '100%', height: 'auto' }}
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
        qualities={displayQualities}
        selectedQuality={selectedQuality}
        onQualityChange={changeQuality}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={changePlaybackSpeed}
        qualityTooltip="Select video quality"
        speedTooltip="Select playback speed"
      />
    </MediaPlayer>
  );
}
