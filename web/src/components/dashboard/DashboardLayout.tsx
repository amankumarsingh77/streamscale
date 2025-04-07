import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import VideoList from "./VideoList";
import VideoUpload from "./VideoUpload";
import SettingsPanel from "./Settings";
import VideoDetails from "./VideoDetails";
import MyVideos from "./MyVideos";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";
import DashboardAnalytics from "./DashboardAnalytics";

export default function DashboardLayout() {
  const location = useLocation();
  const showNavbar = ["/dashboard", "/dashboard/upload", "/dashboard/videos"].includes(location.pathname);
  const isVideoDetails = location.pathname.startsWith("/dashboard/play/");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

      {/* Navbar */}
      {showNavbar && <Navbar />}

      {/* Main Content */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 relative",
          showNavbar ? "md:pl-64" : "",
          isVideoDetails ? "bg-[#0A0A0A]" : ""
        )}
      >
        <main
          className={cn(
            "mx-auto",
            isVideoDetails ? "max-w-full" : "container max-w-[1400px] py-6 px-4 sm:px-6 lg:px-8"
          )}
        >
          <div className="relative">
            <Routes>
              <Route path="" element={<DashboardAnalytics />} />
              <Route path="upload" element={<VideoUpload />} />
              <Route path="settings" element={<SettingsPanel />} />
              <Route path="play/:videoId" element={<VideoDetails />} />
              <Route path="videos" element={<MyVideos />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
