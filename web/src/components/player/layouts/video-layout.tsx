import "@vidstack/react/player/styles/default/captions.css";
import "./captions.module.css"; // Custom enhancements
import styles from "./video-layout.module.css";

import { Captions, Controls, Gesture } from "@vidstack/react";

import * as Buttons from "../buttons";
import * as Menus from "../menus";
import * as Sliders from "../sliders";
import { TimeGroup } from "../time-group";
import { Title } from "../title";

interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
  kind: "subtitles" | "captions";
}

export interface VideoLayoutProps {
  thumbnails?: string;
  qualities?: string[];
  selectedQuality?: string;
  onQualityChange?: (quality: string) => void;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
  qualityTooltip?: string;
  speedTooltip?: string;
  subtitleTracks?: SubtitleTrack[];
}

export function VideoLayout({
  thumbnails,
  qualities = [],
  selectedQuality = "auto",
  onQualityChange,
  playbackSpeed = 1,
  onPlaybackSpeedChange,
  qualityTooltip,
  speedTooltip,
  subtitleTracks = [],
}: VideoLayoutProps) {
  return (
    <>
      <Gestures />
      <Captions
        className="vds-captions media-preview:opacity-0 media-controls:bottom-[85px] media-captions:opacity-100 absolute inset-0 bottom-2 z-10 select-none break-words opacity-0 transition-[opacity,bottom] duration-300"
        onLoad={() => console.log("🎬 Captions component loaded")}
        onError={(error) => console.error("❌ Captions error:", error)}
      />
      <Controls.Root
        className={`${styles.controls} media-controls:opacity-100 absolute inset-0 z-10 flex h-full w-full flex-col bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity`}
      >
        <div className="flex-1" />
        <Controls.Group className="flex w-full items-center px-2">
          <Sliders.Time thumbnails={thumbnails} />
        </Controls.Group>
        <Controls.Group className="-mt-0.5 flex w-full items-center px-2 pb-2">
          <Buttons.Play tooltipPlacement="top start" />
          <Buttons.Mute tooltipPlacement="top" />
          <Sliders.Volume />
          <TimeGroup />
          <Title />
          <div className="flex-1" />
          <Buttons.Caption tooltipPlacement="top" />
          <Menus.Settings
            placement="top end"
            tooltipPlacement="top"
            qualities={qualities}
            selectedQuality={selectedQuality}
            onQualityChange={onQualityChange}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={onPlaybackSpeedChange}
            subtitleTracks={subtitleTracks}
          />
          <Buttons.PIP tooltipPlacement="top" />
          <Buttons.Fullscreen tooltipPlacement="top end" />
        </Controls.Group>
      </Controls.Root>
    </>
  );
}

function Gestures() {
  return (
    <>
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="pointerup"
        action="toggle:paused"
      />
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="dblpointerup"
        action="toggle:fullscreen"
      />
      <Gesture
        className="absolute left-0 top-0 z-10 block h-full w-1/5"
        event="dblpointerup"
        action="seek:-10"
      />
      <Gesture
        className="absolute right-0 top-0 z-10 block h-full w-1/5"
        event="dblpointerup"
        action="seek:10"
      />
    </>
  );
}
