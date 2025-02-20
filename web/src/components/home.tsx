import React from "react";
import HeroSection from "./landing/HeroSection";
import FeatureGrid from "./landing/FeatureGrid";
import LiveDemo from "./landing/LiveDemo";
import PricingSection from "./landing/PricingSection";
import TechnicalSpecs from "./landing/TechnicalSpecs";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <HeroSection />
      <FeatureGrid />
      <LiveDemo />
      <PricingSection />
      <TechnicalSpecs />
    </div>
  );
};

export default Home;
