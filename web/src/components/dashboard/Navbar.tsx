import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  VideoIcon,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Menu,
  LayoutDashboard,
  Film,
  History,
  Star,
  Zap,
  HelpCircle,
  BarChart3,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

interface NavLink {
  path: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const navSections: NavSection[] = [
  {
    title: "Main",
    links: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: BarChart3,
        description: "Analytics overview",
      },
      {
        path: "/dashboard/videos",
        label: "My Videos",
        icon: Film,
        description: "Manage your videos",
      },
    ],
  },
  {
    title: "Content",
    links: [
      {
        path: "/dashboard/upload",
        label: "Upload",
        icon: Upload,
        description: "Upload new content",
      },
      {
        path: "/dashboard/history",
        label: "Recent Uploads",
        icon: Clock,
        description: "View recent uploads",
      },
      {
        path: "/dashboard/favorites",
        label: "Favorites",
        icon: Star,
        description: "Your favorite content",
      },
    ],
  },
  {
    title: "System",
    links: [
      {
        path: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        description: "Manage your account",
      },
      {
        path: "/dashboard/help",
        label: "Help & Support",
        icon: HelpCircle,
        description: "Get assistance",
      },
    ],
  },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0f1729]/80 backdrop-blur-xl border-r border-slate-800/60 z-50 shadow-xl shadow-black/20"
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800/60">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5 shadow-lg shadow-indigo-500/20 group">
              <div className="w-full h-full rounded-[10px] bg-[#0f1729] flex items-center justify-center backdrop-blur-xl group-hover:bg-[#0f1729]/80 transition-colors">
                <VideoIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                StreamScale
              </span>
              <span className="text-xs text-slate-400">Creator Studio</span>
            </div>
          </motion.div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title} className="mb-6">
              <div className="px-4 mb-2">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h2>
              </div>
              <nav className="space-y-1 px-3">
                {section.links.map((link, index) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.1 + index * 0.05 }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start relative h-10 transition-all duration-300 group rounded-md",
                          isActive
                            ? "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 font-medium"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                        onClick={() => navigate(link.path)}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        <span>{link.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-r"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}
                        {/* Tooltip */}
                        {link.description && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {link.description}
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Upload Button */}
        <div className="p-4 border-t border-slate-800/60">
          <Button
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-medium shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
            onClick={() => navigate("/dashboard/upload")}
          >
            <Sparkles className="w-4 h-4" />
            New Upload
          </Button>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full gap-3 text-slate-400 hover:text-white justify-start pl-3 group rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 backdrop-blur-sm flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white truncate">
                    {user?.name}
                  </div>
                  <div className="text-xs text-slate-400">Creator</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 py-2 bg-[#0f1729]/95 backdrop-blur-xl border-slate-800/60 rounded-lg shadow-xl"
            >
              <div className="px-3 py-2 border-b border-slate-800/60">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <div className="px-2 py-1.5">
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/settings")}
                  className="px-2 py-1.5 text-sm font-medium text-slate-300 hover:text-white focus:text-white hover:bg-indigo-500/10 focus:bg-indigo-500/10 rounded-md"
                >
                  <Settings className="w-4 h-4 mr-2 text-indigo-400" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="px-2 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 focus:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 rounded-md mt-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#0f1729]/80 backdrop-blur-lg border border-slate-800/60 text-slate-400 hover:text-white rounded-lg shadow-lg"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 p-0 bg-[#0f1729]/95 border-slate-800/60 shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="p-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5">
                    <div className="w-full h-full rounded-[10px] bg-[#0f1729] flex items-center justify-center">
                      <VideoIcon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                      StreamScale
                    </span>
                    <span className="text-xs text-slate-400">
                      Creator Studio
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="flex-1 overflow-y-auto py-4">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-6">
                    <div className="px-4 mb-2">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {section.title}
                      </h2>
                    </div>
                    <nav className="space-y-1 px-3">
                      {section.links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;
                        return (
                          <Button
                            key={link.path}
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start h-10 rounded-md",
                              isActive
                                ? "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 font-medium"
                                : "text-slate-400 hover:text-white"
                            )}
                            onClick={() => {
                              navigate(link.path);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            {link.label}
                            {link.description && (
                              <span className="ml-2 text-xs text-slate-500">
                                {link.description}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>

              {/* Mobile Quick Upload */}
              <div className="p-4 border-t border-slate-800/60">
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-medium shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 rounded-md"
                  onClick={() => {
                    navigate("/dashboard/upload");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  New Upload
                </Button>
              </div>

              {/* Mobile User Section */}
              <div className="p-4 border-t border-slate-800/60">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 backdrop-blur-sm flex items-center justify-center border border-indigo-500/20">
                    <User className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {user?.name}
                    </div>
                    <div className="text-xs text-slate-400">{user?.email}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md"
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
