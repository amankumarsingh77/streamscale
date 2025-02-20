import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  Zap, 
  BarChart, 
  Shield, 
  Cog, 
  ArrowRight,
  Layers,
  MonitorPlay
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const TechnicalShowcase = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Cpu,
      title: "Intelligent Processing",
      description: "AI-powered encoding decisions for optimal quality and efficiency",
      gradient: "from-violet-500 to-fuchsia-500",
      stats: [
        { label: "Processing Speed", value: "60fps" },
        { label: "GPU Acceleration", value: "Enabled" }
      ]
    },
    {
      icon: Zap,
      title: "Real-Time Analytics",
      description: "Live monitoring of encoding performance and quality metrics",
      gradient: "from-blue-500 to-violet-500",
      stats: [
        { label: "Latency", value: "<1s" },
        { label: "Accuracy", value: "99.9%" }
      ]
    },
    {
      icon: BarChart,
      title: "Quality Metrics",
      description: "Advanced quality assessment using VMAF and SSIM scoring",
      gradient: "from-emerald-500 to-teal-500",
      stats: [
        { label: "VMAF Score", value: "95+" },
        { label: "SSIM Score", value: "0.98" }
      ]
    }
  ];

  const metrics = [
    { label: "Average Processing Time", value: "2.5x Faster", change: "+150%" },
    { label: "Quality Retention", value: "99.8%", change: "+40%" },
    { label: "Bandwidth Savings", value: "Up to 90%", change: "+25%" },
    { label: "Global Edge Locations", value: "150+", change: "+45%" }
  ];

  return (
    <section className="w-full py-24 bg-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            <span className="text-white">Advanced </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Processing Metrics
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Industry-leading performance with real-time analytics and monitoring
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 bg-black/40 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all duration-300">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} p-0.5 mb-6`}>
                <div className="w-full h-full rounded-[7px] bg-black/90 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 mb-6">{feature.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                {feature.stats.map((stat, statIndex) => (
                  <div key={statIndex} className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-slate-400 mb-1">{stat.label}</div>
                    <div className="text-lg font-semibold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Metrics Grid */}
        <Card className="bg-black/40 backdrop-blur-xl border-slate-800 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="text-sm text-slate-400">{metric.label}</div>
                <div className="text-2xl font-bold text-white">{metric.value}</div>
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <ArrowRight className="w-3 h-3 mr-1 rotate-45" />
                  {metric.change}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-violet-600 hover:bg-violet-700 text-lg font-medium tracking-wide"
          >
            Start Processing
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TechnicalShowcase;
