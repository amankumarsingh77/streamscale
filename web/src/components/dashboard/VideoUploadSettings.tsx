import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Settings, Video, Zap, Shield, Info, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

interface VideoUploadSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: VideoUploadSettings) => void;
  defaultSettings?: VideoUploadSettings;
}

export interface VideoUploadSettings {
  codec: "h264" | "av1";
  qualities: {
    resolution: string;
    bitrate: number;
    enabled: boolean;
  }[];
  outputFormats: string[];
  enablePerTitleEncoding: boolean;
}

const defaultSettings: VideoUploadSettings = {
  codec: "h264",
  qualities: [
    { resolution: "1080p", bitrate: 5000000, enabled: true },
    { resolution: "720p", bitrate: 2500000, enabled: false },
    { resolution: "480p", bitrate: 1000000, enabled: false },
    { resolution: "360p", bitrate: 600000, enabled: false }
  ],
  outputFormats: ["hls"],
  enablePerTitleEncoding: false
};

const qualityOptions = [
  { resolution: "1080p", width: 1920, height: 1080, defaultBitrate: 5000000 },
  { resolution: "720p", width: 1280, height: 720, defaultBitrate: 2500000 },
  { resolution: "480p", width: 854, height: 480, defaultBitrate: 1000000 },
  { resolution: "360p", width: 640, height: 360, defaultBitrate: 600000 }
];

export function VideoUploadSettings({ isOpen, onClose, onSubmit, defaultSettings: initialSettings }: VideoUploadSettingsProps) {
  const [settings, setSettings] = useState<VideoUploadSettings>(initialSettings || defaultSettings);
  const [activeTab, setActiveTab] = useState("basic");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out disabled qualities
    const filteredSettings = {
      ...settings,
      qualities: settings.qualities.filter(q => q.enabled)
    };
    
    // Ensure at least one quality is enabled
    if (filteredSettings.qualities.length === 0) {
      filteredSettings.qualities = [{ resolution: "1080p", bitrate: 5000000, enabled: true }];
    }
    
    onSubmit(filteredSettings);
    onClose();
  };

  const toggleQuality = (resolution: string) => {
    setSettings({
      ...settings,
      qualities: settings.qualities.map(q => 
        q.resolution === resolution 
          ? { ...q, enabled: !q.enabled } 
          : q
      )
    });
  };

  const updateBitrate = (resolution: string, bitrate: number) => {
    setSettings({
      ...settings,
      qualities: settings.qualities.map(q => 
        q.resolution === resolution 
          ? { ...q, bitrate } 
          : q
      )
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-b from-gray-900 to-gray-950 border-gray-800 shadow-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-white">Video Encoding Settings</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Configure how your video will be processed and delivered to viewers
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-2 bg-gray-800/50">
            <TabsTrigger value="basic" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Basic Settings
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Advanced Settings
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <TabsContent value="basic" className="space-y-6 py-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-gray-300 text-sm font-medium">Codec Selection</Label>
                  <RadioGroup
                    value={settings.codec}
                    onValueChange={(value) => setSettings({ ...settings, codec: value as "h264" | "av1" })}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="h264"
                        id="h264"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="h264"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-800 bg-gray-900 p-4 hover:bg-gray-800/50 peer-data-[state=checked]:border-indigo-500 [&:has([data-state=checked])]:border-indigo-500 cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 mb-2">
                          <Video className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-white">H.264</p>
                          <p className="text-xs text-gray-400">Better compatibility</p>
                        </div>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem
                        value="av1"
                        id="av1"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="av1"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-800 bg-gray-900 p-4 hover:bg-gray-800/50 peer-data-[state=checked]:border-indigo-500 [&:has([data-state=checked])]:border-indigo-500 cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 mb-2">
                          <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-white">AV1</p>
                          <p className="text-xs text-gray-400">Better quality</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-300 text-sm font-medium">Quality Profiles</Label>
                    <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                      Select multiple
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {qualityOptions.map((quality) => {
                      const currentQuality = settings.qualities.find(q => q.resolution === quality.resolution);
                      const isEnabled = currentQuality?.enabled || false;
                      
                      return (
                        <div 
                          key={quality.resolution}
                          className={`p-4 rounded-lg border-2 ${isEnabled 
                            ? 'border-indigo-500 bg-indigo-500/5' 
                            : 'border-gray-800 bg-gray-900'
                          } transition-colors`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                id={`quality-${quality.resolution}`}
                                checked={isEnabled}
                                onCheckedChange={() => toggleQuality(quality.resolution)}
                                className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                              />
                              <div className="flex items-center gap-2">
                                <Label 
                                  htmlFor={`quality-${quality.resolution}`}
                                  className="text-sm font-medium cursor-pointer text-white"
                                >
                                  {quality.resolution}
                                </Label>
                                <span className="text-xs text-gray-500">
                                  {quality.width}×{quality.height}
                                </span>
                              </div>
                            </div>
                            <Badge className={`${isEnabled ? 'bg-indigo-500' : 'bg-gray-700'} text-white`}>
                              {(currentQuality?.bitrate || quality.defaultBitrate) / 1000} kbps
                            </Badge>
                          </div>
                          
                          {isEnabled && (
                            <div className="pl-8 pt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400">Bitrate</span>
                                <span className="text-xs text-gray-400">
                                  {(currentQuality?.bitrate || quality.defaultBitrate) / 1000} kbps
                                </span>
                              </div>
                              <Slider
                                value={[(currentQuality?.bitrate || quality.defaultBitrate) / 1000]}
                                min={500}
                                max={10000}
                                step={100}
                                onValueChange={(value) => updateBitrate(quality.resolution, value[0] * 1000)}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 py-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-gray-300 text-sm font-medium">Output Format</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="format-hls"
                        className="peer sr-only"
                        checked={settings.outputFormats.includes("hls")}
                        onChange={() => {
                          const newFormats = settings.outputFormats.includes("hls")
                            ? settings.outputFormats.filter(f => f !== "hls")
                            : [...settings.outputFormats, "hls"];
                          setSettings({ ...settings, outputFormats: newFormats });
                        }}
                      />
                      <Label
                        htmlFor="format-hls"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-800 bg-gray-900 p-4 hover:bg-gray-800/50 peer-checked:border-indigo-500 cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 mb-2">
                          <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-white">HLS</p>
                          <p className="text-xs text-gray-400">Apple's HTTP Live Streaming</p>
                        </div>
                      </Label>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="format-dash"
                        className="peer sr-only"
                        checked={settings.outputFormats.includes("dash")}
                        onChange={() => {
                          const newFormats = settings.outputFormats.includes("dash")
                            ? settings.outputFormats.filter(f => f !== "dash")
                            : [...settings.outputFormats, "dash"];
                          setSettings({ ...settings, outputFormats: newFormats });
                        }}
                      />
                      <Label
                        htmlFor="format-dash"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-800 bg-gray-900 p-4 hover:bg-gray-800/50 peer-checked:border-indigo-500 cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 mb-2">
                          <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-white">DASH</p>
                          <p className="text-xs text-gray-400">Dynamic Adaptive Streaming over HTTP</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Per-Title Encoding</Label>
                    <p className="text-sm text-gray-400">Optimize quality based on content complexity</p>
                  </div>
                  <Switch
                    checked={settings.enablePerTitleEncoding}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      enablePerTitleEncoding: checked
                    })}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings(defaultSettings)}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  Reset
                </Button>
                <div className="text-xs text-gray-500">
                  {settings.qualities.filter(q => q.enabled).length} qualities selected
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Apply Settings
                </Button>
              </div>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 