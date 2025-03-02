import type { ReactElement } from "react";

import {
  Menu,
  Tooltip,
  useCaptionOptions,
  type MenuPlacement,
  type TooltipPlacement,
} from "@vidstack/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClosedCaptionsIcon,
  RadioButtonIcon,
  RadioButtonSelectedIcon,
  SettingsIcon,
  FullscreenIcon,
  PlayIcon,
} from "@vidstack/react/icons";

import { buttonClass, tooltipClass } from "./buttons";

export interface SettingsProps {
  placement: MenuPlacement;
  tooltipPlacement: TooltipPlacement;
  qualities?: string[];
  selectedQuality?: string;
  onQualityChange?: (quality: string) => void;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
}

export const menuClass =
  "animate-out fade-out slide-out-to-bottom-2 data-[open]:animate-in data-[open]:fade-in data-[open]:slide-in-from-bottom-4 flex h-[var(--menu-height)] max-h-[400px] min-w-[260px] flex-col overflow-y-auto overscroll-y-contain rounded-md border border-white/10 bg-black/95 p-2.5 font-sans text-[15px] font-medium outline-none backdrop-blur-sm transition-[height] duration-300 will-change-[height] data-[resizing]:overflow-hidden";

export const submenuClass =
  "hidden w-full flex-col items-start justify-center outline-none data-[keyboard]:mt-[3px] data-[open]:inline-block";

export function Settings({ 
  placement, 
  tooltipPlacement,
  qualities = [],
  selectedQuality = 'auto',
  onQualityChange,
  playbackSpeed = 1,
  onPlaybackSpeedChange
}: SettingsProps) {
  return (
    <Menu.Root className="parent">
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Menu.Button className={buttonClass}>
            <SettingsIcon className="h-8 w-8 transform transition-transform duration-200 ease-out group-data-[open]:rotate-90" />
          </Menu.Button>
        </Tooltip.Trigger>
        <Tooltip.Content className={tooltipClass} placement={tooltipPlacement}>
          Settings
        </Tooltip.Content>
      </Tooltip.Root>
      <Menu.Content className={menuClass} placement={placement}>
        <CaptionSubmenu />
        {qualities.length > 0 && (
          <QualitySubmenu 
            qualities={qualities} 
            selectedQuality={selectedQuality} 
            onQualityChange={onQualityChange} 
          />
        )}
        <PlaybackSpeedSubmenu 
          playbackSpeed={playbackSpeed} 
          onPlaybackSpeedChange={onPlaybackSpeedChange} 
        />
      </Menu.Content>
    </Menu.Root>
  );
}

function CaptionSubmenu() {
  const options = useCaptionOptions(),
    hint = options.selectedTrack?.label ?? "Off";
  return (
    <Menu.Root>
      <SubmenuButton
        label="Captions"
        hint={hint}
        disabled={options.disabled}
        icon={<ClosedCaptionsIcon className="w-5 h-5" />}
      />
      <Menu.Content className={submenuClass}>
        <Menu.RadioGroup
          className="w-full flex flex-col"
          value={options.selectedValue}
        >
          {options.map(({ label, value, select }) => (
            <Radio value={value} onSelect={select} key={value}>
              {label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function QualitySubmenu({ 
  qualities, 
  selectedQuality = 'auto', 
  onQualityChange 
}: { 
  qualities: string[], 
  selectedQuality?: string, 
  onQualityChange?: (quality: string) => void 
}) {
  return (
    <Menu.Root>
      <SubmenuButton
        label="Quality"
        hint={selectedQuality}
        icon={<SettingsIcon className="w-5 h-5" />}
      />
      <Menu.Content className={submenuClass}>
        <Menu.RadioGroup
          className="w-full flex flex-col"
          value={selectedQuality}
        >
          {qualities.map((quality) => (
            <Radio 
              value={quality} 
              onSelect={() => onQualityChange?.(quality)} 
              key={quality}
            >
              {quality}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function PlaybackSpeedSubmenu({ 
  playbackSpeed = 1, 
  onPlaybackSpeedChange 
}: { 
  playbackSpeed?: number, 
  onPlaybackSpeedChange?: (speed: number) => void 
}) {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const formatSpeed = (speed: number) => speed === 1 ? 'Normal' : `${speed}x`;
  
  return (
    <Menu.Root>
      <SubmenuButton
        label="Playback Speed"
        hint={formatSpeed(playbackSpeed)}
        icon={<PlayIcon className="w-5 h-5" />}
      />
      <Menu.Content className={submenuClass}>
        <Menu.RadioGroup
          className="w-full flex flex-col"
          value={playbackSpeed.toString()}
        >
          {speeds.map((speed) => (
            <Radio 
              value={speed.toString()} 
              onSelect={() => onPlaybackSpeedChange?.(speed)} 
              key={speed}
            >
              {formatSpeed(speed)}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

export interface RadioProps extends Menu.RadioProps {}

function Radio({ children, ...props }: RadioProps) {
  return (
    <Menu.Radio
      className="ring-media-focus group relative flex w-full cursor-pointer select-none items-center justify-start rounded-sm p-2.5 outline-none data-[hocus]:bg-white/10 data-[focus]:ring-[3px]"
      {...props}
    >
      <RadioButtonIcon className="h-4 w-4 text-white group-data-[checked]:hidden" />
      <RadioButtonSelectedIcon className="text-media-brand hidden h-4 w-4 group-data-[checked]:block" />
      <span className="ml-2">{children}</span>
    </Menu.Radio>
  );
}

export interface SubmenuButtonProps {
  label: string;
  hint: string;
  disabled?: boolean;
  icon: ReactElement;
}

function SubmenuButton({
  label,
  hint,
  icon: Icon,
  disabled,
}: SubmenuButtonProps) {
  return (
    <Menu.Button
      className="ring-media-focus parent left-0 z-10 flex w-full cursor-pointer select-none items-center justify-start rounded-sm bg-black/60 p-2.5 outline-none ring-inset data-[open]:sticky data-[open]:-top-2.5 data-[hocus]:bg-white/10 data-[focus]:ring-[3px] aria-disabled:hidden"
      disabled={disabled}
    >
      <ChevronLeftIcon className="parent-data-[open]:block -ml-0.5 mr-1.5 hidden h-[18px] w-[18px]" />
      <div className="contents parent-data-[open]:hidden">
        {Icon}
      </div>
      <span className="ml-1.5 parent-data-[open]:ml-0">{label}</span>
      <span className="ml-auto text-sm text-white/50">{hint}</span>
      <ChevronRightIcon className="parent-data-[open]:hidden ml-0.5 h-[18px] w-[18px] text-sm text-white/50" />
    </Menu.Button>
  );
}
