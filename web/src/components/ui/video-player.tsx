import "@vidstack/react/player/styles/default/theme.css";
import { useEffect, useRef, useState } from "react";
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
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

interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
  kind: "subtitles" | "captions";
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
  onPlay?: () => void;
  onEnded?: () => void;
}

export function VideoPlayer({
  playbackInfo,
  className = "",
  onPlay,
  onEnded,
}: VideoPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);
  const [viewType, setViewType] = useState<MediaViewType>("unknown");
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const [playerQualities, setPlayerQualities] = useState<string[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [tracksLoaded, setTracksLoaded] = useState<boolean>(false);

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

  const processSubtitles = (): SubtitleTrack[] => {
    if (!playbackInfo.subtitles || playbackInfo.subtitles.length === 0) {
      return [];
    }

    return playbackInfo.subtitles.map((subtitleUrl, index) => {
      // Ensure the URL is properly formatted and accessible
      const cleanUrl = subtitleUrl.trim();

      // Extract language from filename (e.g., "subtitle_0_en.vtt" -> "en")
      const filename = cleanUrl.split("/").pop() || "";
      const languageMatch = filename.match(/subtitle_\d+_([a-z]{2,3})\.vtt$/i);
      const language = languageMatch ? languageMatch[1] : "und";

      // Create human-readable label
      const languageLabels: { [key: string]: string } = {
        en: "English",
        es: "Spanish",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        ru: "Russian",
        ja: "Japanese",
        ko: "Korean",
        zh: "Chinese",
        ar: "Arabic",
        hi: "Hindi",
        und: "Unknown",
      };

      // Use language code as primary identifier, with human-readable label as secondary
      const label =
        languageLabels[language.toLowerCase()] || language.toUpperCase();

      console.log(
        `Processing subtitle track: ${label} (${language}) - URL: ${cleanUrl}`
      );

      return {
        src: cleanUrl,
        label,
        language: language.toLowerCase(),
        kind: "subtitles" as const,
      };
    });
  };

  const changeQuality = (quality: string) => {
    if (quality === selectedQuality) return;

    let currentTime = 0;
    let isPaused = true;

    if (player.current) {
      currentTime = player.current.currentTime;
      isPaused = player.current.paused;

      if (
        player.current.qualities &&
        typeof player.current.qualities === "object"
      ) {
        try {
          // Use a public method to retrieve qualities safely
          const qualityItems = player.current.qualities.toArray?.() || [];

          if (Array.isArray(qualityItems)) {
            const qualityItem = qualityItems.find(
              (item) =>
                `${item.height}p` === quality ||
                item.height.toString() === quality
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
      player.current.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);

    if (player.current) {
      player.current.playbackRate = speed;
    }
  };

  useEffect(() => {
    if (!player.current) return;

    const unsubscribe = player.current.subscribe(({ viewType }) => {
      setViewType(viewType);
    });

    // Add comprehensive subtitle debugging
    const playerElement = player.current;

    // Listen for text track events
    const handleTextTracksChange = () => {
      console.log("🎬 Text tracks changed:", playerElement.textTracks?.length);
      if (playerElement.textTracks) {
        Array.from(playerElement.textTracks).forEach((track, index) => {
          console.log(`📝 Track ${index}:`, {
            label: track.label,
            language: track.language,
            kind: track.kind,
            mode: track.mode,
            readyState: track.readyState,
            src: track.src,
          });
        });
      }
    };

    // Listen for subtitle loading events
    const handleLoadStart = () => {
      console.log("🚀 Media load started");
      setTimeout(handleTextTracksChange, 1000); // Check tracks after load
    };

    const handleLoadedMetadata = () => {
      console.log("📊 Media metadata loaded");
      handleTextTracksChange();
    };

    const handleCanPlay = () => {
      console.log("▶️ Media can play");
      handleTextTracksChange();
    };

    // Add event listeners
    playerElement.addEventListener("loadstart", handleLoadStart);
    playerElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    playerElement.addEventListener("canplay", handleCanPlay);

    return () => {
      unsubscribe();
      playerElement.removeEventListener("loadstart", handleLoadStart);
      playerElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      playerElement.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  // Test subtitle URL accessibility and content
  const testSubtitleUrl = async (url: string, label: string) => {
    try {
      // First check if URL is accessible
      const headResponse = await fetch(url, { method: "HEAD" });
      if (!headResponse.ok) {
        console.warn(
          `⚠️ Subtitle "${label}" returned ${headResponse.status}: ${url}`
        );
        return;
      }

      // Then fetch and validate VTT content
      const response = await fetch(url);
      if (response.ok) {
        const vttContent = await response.text();
        console.log(`✅ Subtitle "${label}" is accessible: ${url}`);
        console.log(
          `📄 VTT Content preview for "${label}":`,
          vttContent.substring(0, 200) + "..."
        );

        // Basic VTT validation
        if (!vttContent.startsWith("WEBVTT")) {
          console.error(
            `❌ Invalid VTT format for "${label}" - missing WEBVTT header`
          );
        } else {
          console.log(`✅ Valid VTT format for "${label}"`);
        }
      } else {
        console.warn(
          `⚠️ Subtitle "${label}" returned ${response.status}: ${url}`
        );
      }
    } catch (error) {
      console.error(`❌ Subtitle "${label}" failed to load: ${url}`, error);
    }
  };

  // Process subtitles when playbackInfo changes
  useEffect(() => {
    const tracks = processSubtitles();
    setSubtitleTracks(tracks);

    if (tracks.length > 0) {
      console.log(`Loaded ${tracks.length} subtitle tracks:`, tracks);

      // Test each subtitle URL accessibility
      tracks.forEach((track) => {
        testSubtitleUrl(track.src, track.label);
      });
    } else {
      console.log("No subtitle tracks available");
    }
  }, [playbackInfo.subtitles]);

  // Force enable captions when tracks are loaded
  useEffect(() => {
    if (subtitleTracks.length > 0 && player.current) {
      console.log("🎯 Attempting to force enable captions...");

      // Wait a bit for tracks to be registered
      setTimeout(() => {
        if (player.current?.textTracks) {
          const textTracks = Array.from(player.current.textTracks);
          console.log(`Found ${textTracks.length} text tracks in player`);

          textTracks.forEach((track, index) => {
            console.log(
              `Forcing track ${index} mode to 'showing':`,
              track.label
            );
            track.mode = "showing";
          });

          // Also try to enable captions through the player API
          if (textTracks.length > 0) {
            console.log("Setting textTrack to first available track");
            try {
              if (player.current && "textTrack" in player.current) {
                (player.current as any).textTrack = textTracks[0];
              }
            } catch (error) {
              console.log("Could not set textTrack:", error);
            }
          }
        }
      }, 2000);
    }
  }, [subtitleTracks, player.current]);

  useEffect(() => {
    console.log(player.current?.qualities);
    const checkPlayerQualities = () => {
      if (player.current?.qualities) {
        try {
          // Use a public method if available (e.g., `toArray()` or `getAvailableQualities()`)
          const qualityItems = player.current.qualities.toArray?.() || [];

          if (Array.isArray(qualityItems)) {
            const extractedQualities = qualityItems.map(
              (item) => `${item.height}p`
            );
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

      const filteredQualities = [
        "auto",
        ...qualities.filter((q) => q !== "master"),
      ];
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
      const validQualities = playerQualities.filter((q) => {
        return (
          q === "auto" ||
          /^\d+p$/.test(q) ||
          /^\d+x\d+$/.test(q) ||
          /^(low|medium|high|hd|fullhd|ultrahd|4k)$/i.test(q)
        );
      });

      if (validQualities.length > 0) {
        const updatedQualities = validQualities.includes("auto")
          ? validQualities
          : ["auto", ...validQualities];
        setAvailableQualities(updatedQualities);
      } else {
        const manualQualities = Object.keys(playbackInfo.qualities);
        const filteredManualQualities = [
          "auto",
          ...manualQualities.filter((q) => q !== "master"),
        ];
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

  function onCanPlay(
    detail: MediaCanPlayDetail,
    nativeEvent: MediaCanPlayEvent
  ) {
    console.log(
      "Media can play, checking subtitle tracks...",
      subtitleTracks.length
    );

    if (player.current?.qualities) {
      try {
        // Use a public method like `toArray()` instead of accessing `items` directly
        const qualityItems = player.current.qualities.toArray?.() || [];

        if (Array.isArray(qualityItems)) {
          const extractedQualities = qualityItems.map(
            (item) => `${item.height}p`
          );
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

    // Check for text tracks and enable the first one
    if (player.current?.textTracks) {
      console.log("Text tracks available:", player.current.textTracks.length);

      // Enable the first subtitle track if available
      const textTracks = Array.from(player.current.textTracks);
      textTracks.forEach((track, index) => {
        console.log(`Track ${index}:`, {
          label: track.label,
          language: track.language,
          kind: track.kind,
          mode: track.mode,
          readyState: track.readyState,
        });

        // Enable the first subtitle track
        if (index === 0 && track.kind === "subtitles") {
          track.mode = "showing";
          console.log(`✅ Enabled subtitle track: ${track.label}`);
        }
      });
    }
  }

  const playbackUrl = getPlaybackUrl();

  if (!playbackUrl) {
    return <div>No playback URL available</div>;
  }

  const displayQualities =
    playerQualities.length > 0 ? playerQualities : availableQualities;

  return (
    <MediaPlayer
      className="w-full aspect-video bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4"
      src={currentSrc || getQualityUrl(selectedQuality)}
      crossOrigin
      playsInline
      onProviderChange={onProviderChange}
      onCanPlay={onCanPlay}
      onPlay={onPlay}
      onEnded={onEnded}
      ref={player}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <MediaProvider>
        {playbackInfo.thumbnail && (
          <Poster
            className="absolute inset-0 block h-full w-full rounded-md opacity-0 transition-opacity data-[visible]:opacity-100 object-cover"
            src={playbackInfo.thumbnail}
            alt={playbackInfo.title}
          />
        )}
        {/* Add subtitle tracks */}
        {subtitleTracks.map((track, index) => {
          console.log(`🎭 Rendering subtitle track: ${track} - ${track.src}`);
          return (
            <Track
              key={`subtitle-${track.language}-${index}`}
              src={track.src}
              kind={track.kind}
              label={track.label}
              language={track.language}
              default={index === 0} // Make first subtitle track default
              type="vtt"
              // onLoad={() => {
              //   console.log(`✅ Track loaded: ${track.label}`);
              //   setTracksLoaded(true);
              // }}
              // onError={(error) => {
              //   console.error(`❌ Track load error for ${track.label}:`, error);
              // }}
            />
          );
        })}

        {/* Add a test subtitle track for debugging */}
        {/* {subtitleTracks.length === 0 && (
          <Track
            key="test-subtitle"
            src="data:text/vtt;charset=utf-8,WEBVTT%0A%0A00%3A00%3A00.000%20--%3E%2000%3A00%3A05.000%0ATest%20subtitle%20-%20if%20you%20see%20this%2C%20subtitles%20are%20working!"
            kind="subtitles"
            label="Test Subtitle"
            language="en"
            default={true}
            type="vtt"
            onLoad={() => {
              console.log(`✅ Test track loaded`);
            }}
            onError={(error) => {
              console.error(`❌ Test track error:`, error);
            }}
          />
        )} */}
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
        subtitleTracks={subtitleTracks}
      />
    </MediaPlayer>
  );
}
