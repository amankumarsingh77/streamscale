import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Cpu, Zap, Shield, Globe, Cog } from "lucide-react";

const defaultEncodingParams = [
  { 
    title: "Video Processing",
    specs: [
      { label: "Codecs", value: "H.264, HEVC (H.265), VP9, AV1" },
      { label: "Resolution", value: "Up to 8K (7680×4320)" },
      { label: "Frame Rate", value: "Up to 120 fps" },
      { label: "Bit Depth", value: "8-bit / 10-bit" },
      { label: "HDR", value: "HDR10, HLG, Dolby Vision" }
    ]
  },
  {
    title: "Audio Processing",
    specs: [
      { label: "Codecs", value: "AAC, Opus, AC-3, E-AC-3" },
      { label: "Sample Rate", value: "Up to 48 kHz" },
      { label: "Channels", value: "Up to 7.1 surround" },
      { label: "Bitrate", value: "32 Kbps - 512 Kbps" }
    ]
  },
  {
    title: "Streaming Formats",
    specs: [
      { label: "Protocols", value: "HLS, DASH, CMAF" },
      { label: "Packaging", value: "fMP4, TS" },
      { label: "DRM", value: "Widevine, PlayReady, FairPlay" },
      { label: "Low Latency", value: "LL-HLS, LL-DASH" }
    ]
  }
];

const defaultApiExamples = [
  {
    language: "curl",
    code: `curl -X POST "https://api.streamscale.com/v1/encode" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "s3://your-bucket/input.mp4",
    "output": {
      "format": "hls",
      "presets": ["4k_hdr", "1080p", "720p"],
      "packaging": {
        "hls": {
          "segment_duration": 6,
          "master_playlist": true
        }
      }
    }
  }'`
  },
  {
    language: "javascript",
    code: `const response = await fetch('https://api.streamscale.com/v1/encode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: 's3://your-bucket/input.mp4',
    output: {
      format: 'hls',
      presets: ['4k_hdr', '1080p', '720p'],
      packaging: {
        hls: {
          segment_duration: 6,
          master_playlist: true
        }
      }
    }
  })
});`
  },
  {
    language: "python",
    code: `import requests

response = requests.post(
    'https://api.streamscale.com/v1/encode',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'input': 's3://your-bucket/input.mp4',
        'output': {
            'format': 'hls',
            'presets': ['4k_hdr', '1080p', '720p'],
            'packaging': {
                'hls': {
                    'segment_duration': 6,
                    'master_playlist': True
                }
            }
        }
    }
)`
  }
];

const TechnicalSpecs = () => {
  return (
    <section className="w-full py-24 bg-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            <span className="text-white">Enterprise-Grade </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Video Infrastructure
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Cutting-edge video processing capabilities with flexible API integration
          </p>
        </div>

        <div className="grid gap-8">
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5 mb-4">
                <div className="w-full h-full rounded-[7px] bg-black/90 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Advanced Processing</h3>
              <p className="text-slate-400">8K resolution support with HDR and high frame rate capabilities</p>
            </Card>

            <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 p-0.5 mb-4">
                <div className="w-full h-full rounded-[7px] bg-black/90 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Encoding</h3>
              <p className="text-slate-400">Ultra-fast encoding with GPU acceleration and parallel processing</p>
            </Card>

            <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5 mb-4">
                <div className="w-full h-full rounded-[7px] bg-black/90 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Global Delivery</h3>
              <p className="text-slate-400">Edge-optimized content delivery with multi-CDN support</p>
            </Card>
          </div>

          {/* Technical Details */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Encoding Parameters */}
            <div className="space-y-6">
              {defaultEncodingParams.map((section, index) => (
                <Card key={index} className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Cog className="w-5 h-5 text-violet-400" />
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.specs.map((spec, specIndex) => (
                      <div key={specIndex} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                        <span className="text-sm text-slate-400">{spec.label}</span>
                        <span className="text-sm font-mono text-violet-300">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* API Examples */}
            <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-violet-400" />
                API Integration
              </h3>
              <Tabs defaultValue={defaultApiExamples[0].language} className="w-full">
                <TabsList className="w-full bg-black/60 backdrop-blur-sm p-1 rounded-lg mb-4">
                  {defaultApiExamples.map((example) => (
                    <TabsTrigger
                      key={example.language}
                      value={example.language}
                      className="flex-1 data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                    >
                      {example.language.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {defaultApiExamples.map((example) => (
                  <TabsContent
                    key={example.language}
                    value={example.language}
                    className="mt-2"
                  >
                    <div className="relative group">
                      <pre className="bg-black/60 backdrop-blur-sm p-4 rounded-lg overflow-x-auto border border-slate-800 group-hover:border-slate-700 transition-colors">
                        <code className="text-sm font-mono text-violet-100">
                          {example.code}
                        </code>
                      </pre>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnicalSpecs;
