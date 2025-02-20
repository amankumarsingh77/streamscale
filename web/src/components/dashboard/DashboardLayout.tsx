import React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VideoIcon,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Bell,
  User,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import VideoList from "./VideoList";
import VideoUpload from "./VideoUpload";
import SettingsPanel from "./Settings";
import VideoDetails from "./VideoDetails";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";

const navLinks = [
  { path: "/dashboard", label: "My Videos", icon: VideoIcon },
  { path: "/dashboard/upload", label: "Upload", icon: Upload },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-black/40 backdrop-blur-xl">
        <div className="max-w-8xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Top Bar */}
            <div className="h-16 flex items-center justify-between">
              {/* Logo and Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5 shadow-lg shadow-violet-500/20">
                  <div className="w-full h-full rounded-[10px] bg-black flex items-center justify-center backdrop-blur-xl">
                    <VideoIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                    StreamScale
                  </span>
                  <span className="text-xs text-slate-400">Creator Studio</span>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-6">
                {/* Notification Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white relative"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
                  </Button>
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-3 text-slate-400 hover:text-white pl-3 pr-4"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 backdrop-blur-sm flex items-center justify-center border border-violet-500/20">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden md:block text-left">
                          <div className="text-sm font-medium text-white">{user?.name}</div>
                          <div className="text-xs text-slate-400">Creator</div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 py-2 bg-black/90 backdrop-blur-xl border-slate-800">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                    </div>
                    <div className="px-2 py-1.5">
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard/settings')}
                        className="px-2 py-1.5 text-sm font-medium text-slate-300 hover:text-white focus:text-white hover:bg-violet-500/10 focus:bg-violet-500/10"
                      >
                        <Settings className="w-4 h-4 mr-2 text-violet-400" />
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="px-2 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 focus:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Navigation */}
            <div className="h-14 flex items-center justify-between border-t border-slate-800">
              <nav className="flex items-center">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.path}
                      variant="ghost"
                      className={`
                        h-14 px-4 rounded-none border-b-2 transition-colors
                        ${location.pathname === link.path
                          ? 'text-violet-400 border-violet-500 bg-violet-500/5'
                          : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                        }
                      `}
                      onClick={() => navigate(link.path)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {link.label}
                    </Button>
                  );
                })}
              </nav>

              {/* Upload Button */}
              <Button
                className="bg-violet-600 hover:bg-violet-700 font-medium shadow-lg shadow-violet-500/20"
                onClick={() => navigate('/dashboard/upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                New Upload
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-8xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="" element={<VideoList />} />
          <Route path="upload" element={<VideoUpload />} />
          <Route path="settings" element={<SettingsPanel />} />
          <Route path="play/:videoId" element={<VideoDetails />} />
        </Routes>
      </main>
    </div>
  );
}
