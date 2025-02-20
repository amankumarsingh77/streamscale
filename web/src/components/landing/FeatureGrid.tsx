import React from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileVideo2,
  Code2,
  Clapperboard,
  Waves,
  Zap,
  Share2,
  Shield,
  Globe,
  Cpu,
  BarChart,
  Layers,
  Smartphone,
  Cloud,
  Code,
  LucideIcon
} from "lucide-react";

interface FeatureGridProps {
  features?: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
    tooltip?: string;
    gradient: string;
  }>;
}

const defaultFeatures = [
  {
    icon: FileVideo2,
    title: "Multiple Formats",
    description: "Support for MP4, MOV, AVI, MKV and more",
    tooltip: "Convert between any popular video format",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Code2,
    title: "Advanced Codecs",
    description: "H.264, HEVC, VP9 encoding support",
    tooltip: "Industry standard codec support",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    icon: Clapperboard,
    title: "Streaming Ready",
    description: "HLS and DASH streaming protocols",
    tooltip: "Optimized for streaming platforms",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: Waves,
    title: "Quality Control",
    description: "Adjustable bitrate and resolution",
    tooltip: "Fine-tune your video quality",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "GPU-accelerated encoding",
    tooltip: "Lightning fast video processing",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Share2,
    title: "Easy Integration",
    description: "RESTful API and SDKs available",
    tooltip: "Seamless integration with your stack",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and security measures to protect your content.",
    tooltip: "Secure and reliable content protection",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    icon: Globe,
    title: "Global CDN",
    description: "Content delivery at the edge for blazing-fast streaming worldwide.",
    tooltip: "Optimized content delivery for global audiences",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: Cpu,
    title: "AI-Powered Optimization",
    description: "Smart algorithms optimize your videos for the best quality-to-size ratio.",
    tooltip: "Advanced video optimization for better quality and smaller file sizes",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: BarChart,
    title: "Advanced Analytics",
    description: "Detailed insights into your video performance and viewer engagement.",
    tooltip: "Analyze video performance and viewer behavior",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Layers,
    title: "Multi-Format Support",
    description: "Convert videos to any format while maintaining pristine quality.",
    tooltip: "Support for various video formats",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    icon: Smartphone,
    title: "Adaptive Streaming",
    description: "Automatically adjust quality based on viewer's device and connection.",
    tooltip: "Optimized streaming for different devices",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Cloud,
    title: "Cloud Storage",
    description: "Secure, scalable storage for your video content with instant access.",
    tooltip: "Store and manage video content in the cloud",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Code,
    title: "API Integration",
    description: "Robust API for seamless integration with your existing workflow.",
    tooltip: "Seamless integration with your existing systems",
    gradient: "from-teal-500 to-cyan-500",
  },
];

const FeatureGrid = ({ features = defaultFeatures }: FeatureGridProps) => {
  return (
    <div className="bg-black relative overflow-hidden py-24">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="text-white">Powerful Features for </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Professional Results
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Everything you need to process, optimize, and deliver high-quality video content
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Feature Card */}
                <div className="relative h-full p-6 bg-black/40 backdrop-blur-xl rounded-lg border border-slate-800 overflow-hidden transition-all duration-300 hover:border-slate-700 hover:bg-black/60">
                  {/* Icon Container */}
                  <div className="mb-4 inline-flex">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} p-0.5`}>
                      <div className="w-full h-full rounded-[7px] bg-black/90 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">
                    {feature.description}
                  </p>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeatureGrid;
