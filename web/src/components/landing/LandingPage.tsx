import React from "react";
import HeroSection from "./HeroSection";
import TechnicalSpecs from "./TechnicalSpecs";
import TechnicalShowcase from "./LiveDemo";
import FeatureGrid from "./FeatureGrid";
import PricingSection from "./PricingSection";

export default function LandingPage() {
  return (
    <div className="bg-black min-h-screen">
      <HeroSection />
      <FeatureGrid />
      <TechnicalShowcase />
      <TechnicalSpecs />
      <PricingSection />
    </div>
  );
} 