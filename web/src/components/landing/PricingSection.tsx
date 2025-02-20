import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, X, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface PricingTier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

interface PricingFeature {
  name: string;
  basic: boolean;
  pro: boolean;
  enterprise: boolean;
}

interface PricingSectionProps {
  pricingTiers?: PricingTier[];
  features?: PricingFeature[];
}

const defaultPricingTiers: PricingTier[] = [
  {
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 0,
    description: "Perfect for individuals and small projects",
    features: [
      "10 hours of video processing per month",
      "720p and 1080p quality",
      "Basic analytics",
      "Email support",
      "1 team member",
      "5GB storage",
    ],
    highlighted: false,
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    annualPrice: 0,
    description: "Ideal for growing businesses and content creators",
    features: [
      "50 hours of video processing per month",
      "Up to 4K quality",
      "Advanced analytics",
      "Priority support",
      "5 team members",
      "50GB storage",
      "Custom branding",
      "API access",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Custom solutions for large organizations",
    features: [
      "Unlimited video processing",
      "8K support",
      "Enterprise analytics",
      "24/7 dedicated support",
      "Unlimited team members",
      "Custom storage limits",
      "White-label solution",
      "Custom API integration",
      "SLA guarantee",
    ],
    highlighted: false,
  },
];

const defaultFeatures: PricingFeature[] = [
  { name: "Video Processing", basic: true, pro: true, enterprise: true },
  { name: "HLS/DASH Streaming", basic: true, pro: true, enterprise: true },
  {
    name: "Custom Encoding Presets",
    basic: false,
    pro: true,
    enterprise: true,
  },
  { name: "REST API Access", basic: true, pro: true, enterprise: true },
  { name: "Watermarking", basic: false, pro: true, enterprise: true },
  { name: "Advanced Analytics", basic: false, pro: true, enterprise: true },
  { name: "Custom Branding", basic: false, pro: false, enterprise: true },
  { name: "White Label Solution", basic: false, pro: false, enterprise: true },
];

const PricingSection = ({
  pricingTiers = defaultPricingTiers,
  features = defaultFeatures,
}: PricingSectionProps) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative bg-black overflow-hidden py-24">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="text-white">Simple Pricing for </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Every Need
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Choose the perfect plan for your video processing needs
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((plan, index) => (
            <Card
              key={index}
              className={`relative bg-black/40 backdrop-blur-xl border-slate-800 overflow-hidden transition-all duration-300 hover:border-slate-700 ${
                plan.highlighted ? 'ring-2 ring-violet-500 border-transparent' : ''
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              )}
              
              <div className="p-6">
                {/* Plan Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline">
                    {plan.annualPrice ? (
                      <>
                        <span className="text-4xl font-bold text-white">${plan.annualPrice}</span>
                        <span className="text-slate-400 ml-2">/year</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-white">Custom Pricing</span>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center mt-1">
                        <Check className="w-3 h-3 text-violet-400" />
                      </div>
                      <span className="ml-3 text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full font-medium tracking-wide ${
                    plan.highlighted
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  onClick={() => navigate(user ? '/dashboard' : '/register')}
                >
                  {plan.highlighted && <Zap className="w-4 h-4 mr-2" />}
                  {plan.annualPrice ? "Get Started" : "Contact Sales"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-slate-400">
            Have questions?{' '}
            <a href="/faq" className="text-violet-400 hover:text-violet-300 font-medium">
              Check out our FAQ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
