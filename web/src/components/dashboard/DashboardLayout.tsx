import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import VideoList from "./VideoList";
import VideoUpload from "./VideoUpload";
import SettingsPanel from "./Settings";
import VideoDetails from "./VideoDetails";
import MyVideos from "./MyVideos";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";
import DashboardAnalytics from "./DashboardAnalytics";
import { useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const showNavbar = [
    "/dashboard",
    "/dashboard/upload",
    "/dashboard/videos",
    "/dashboard/settings",
  ].includes(location.pathname);
  const isVideoDetails = location.pathname.startsWith("/dashboard/play/");

  // Set page title based on current route
  useEffect(() => {
    const pageName = location.pathname.split("/").pop() || "dashboard";
    const formattedPageName =
      pageName.charAt(0).toUpperCase() + pageName.slice(1);
    document.title = `StreamScale | ${formattedPageName}`;
  }, [location]);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(93,52,236,0.1),transparent_50%)] pointer-events-none" />

      {/* Navbar */}
      {showNavbar && <Navbar />}

      {/* Main Content */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 relative",
          showNavbar ? "md:pl-64" : "",
          isVideoDetails ? "bg-[#030712]" : ""
        )}
      >
        {/* User welcome banner */}
        {!isVideoDetails && user && (
          <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-violet-600/5 border-b border-slate-800/60 py-2 px-4 sm:px-6 lg:px-8 mb-4">
            <div className="container max-w-[1400px] mx-auto flex justify-between items-center">
              <p className="text-sm text-slate-300">
                Welcome back,{" "}
                <span className="font-medium text-white">{user.name}</span>
              </p>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                All systems operational
              </div>
            </div>
          </div>
        )}

        <main
          className={cn(
            "mx-auto",
            isVideoDetails
              ? "max-w-full"
              : "container max-w-[1400px] py-6 px-4 sm:px-6 lg:px-8"
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

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
