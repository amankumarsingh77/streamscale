import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/ui/video-player";
import { videoApi, VideoFile, PlaybackInfo } from "@/lib/videoApi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Upload,
  MoreVertical,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  VideoIcon,
  Trash2,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Calendar,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function VideoList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [isSearching, setIsSearching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPlaybackInfo, setSelectedPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [isActiveSearch, setIsActiveSearch] = useState(false);

  // Fetch videos when page changes or on initial load
  useEffect(() => {
    fetchVideos();
  }, [page, statusFilter, sortBy]);

  const fetchVideos = async () => {
    try {
      setIsSearching(!!debouncedQuery);
      if (page === 1) {
        setLoading(true);
      }

      // Always fetch the main list for the grid view
      const response = await videoApi.listVideos(page);

      let sortedVideos = [...response.videos];

      // Sort videos based on selected criteria
      switch (sortBy) {
        case "date":
          sortedVideos.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
          break;
        case "name":
          sortedVideos.sort((a, b) => a.file_name.localeCompare(b.file_name));
          break;
        case "size":
          sortedVideos.sort((a, b) => b.file_size - a.file_size);
          break;
        case "duration":
          sortedVideos.sort((a, b) => b.duration - a.duration);
          break;
      }

      setVideos(prevVideos =>
        page === 1 ? sortedVideos : [...prevVideos, ...sortedVideos]
      );
      setHasMore(response.has_more || false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Separate state for search results
  const [searchResults, setSearchResults] = useState<VideoFile[]>([]);

  // Handle search as user types
  useEffect(() => {
    const searchVideos = async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const response = await videoApi.searchVideos(searchQuery, 1, 5);
          setSearchResults(response.videos);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const timer = setTimeout(searchVideos, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Filter videos by status for the main grid
  const filteredVideos = videos?.filter((video) => {
    return statusFilter === "all" || video.status === statusFilter;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-200 animate-spin" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const handleVideoAction = async (action: string, video: VideoFile) => {
    switch (action) {
      case "download":
        const playbackInfo = await videoApi.getPlaybackInfo(video.video_id);
        const qualities = Object.keys(playbackInfo.qualities) as Array<keyof typeof playbackInfo.qualities>;
        const highestQuality = qualities[0];
        const downloadUrl = playbackInfo.qualities[highestQuality].urls.hls;
        window.open(downloadUrl, "_blank");
        break;
      case "share":
        const shareUrl = `${window.location.origin}/videos/${video.video_id}`;
        navigator.clipboard.writeText(shareUrl);
        // You could add a toast notification here
        break;
      case "delete":
        if (confirm('Are you sure you want to delete this video?')) {
          await videoApi.deleteVideo(video.video_id);
          fetchVideos();
        }
        break;
    }
  };

  const handleVideoSelect = async (video: VideoFile) => {
    navigate(`/dashboard/play/${video.video_id}`);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-[14px] bg-black flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-400">Loading your videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-violet-400' : 'text-slate-400'
                }`} />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-20 bg-black/20 border-slate-800 text-white w-full transition-all
                  ${isSearching ? 'border-violet-500/50' : 'hover:border-slate-700 focus:border-violet-500/50'}
                  ${searchResults.length > 0 ? 'rounded-t-md rounded-b-none' : 'rounded-md'}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute w-full z-50 mt-[1px] bg-black/90 backdrop-blur-xl border border-t-0 border-slate-800 rounded-b-md shadow-lg max-h-[300px] overflow-y-auto"
                >
                  <div className="p-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center">
                    <span>Search Results</span>
                    <span className="text-violet-400">{searchResults.length} videos</span>
                  </div>
                  {isSearching ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-slate-400 text-sm">No videos found</p>
                    </div>
                  ) : (
                    <div>
                      {searchResults.map((video) => (
                        <motion.div
                          key={video.video_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-2 hover:bg-violet-500/10 cursor-pointer flex items-center gap-3"
                          onClick={() => {
                            navigate(`/dashboard/play/${video.video_id}`);
                            clearSearch();
                          }}
                        >
                          <div className="w-16 h-9 bg-black/40 rounded flex items-center justify-center flex-shrink-0">
                            {video.playback_info?.thumbnail ? (
                              <img
                                src={video.playback_info.thumbnail}
                                alt={video.file_name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <VideoIcon className="w-4 h-4 text-violet-400/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {video.file_name}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span>{formatDuration(video.duration)}</span>
                              <span className="text-slate-600">•</span>
                              <span className={`capitalize ${video.status === 'completed' ? 'text-emerald-400' :
                                video.status === 'processing' ? 'text-amber-400' :
                                  video.status === 'queued' ? 'text-blue-400' :
                                    'text-red-400'
                                }`}>{video.status}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-black/20 border-slate-800 text-white w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-black/20 border-slate-800 text-white w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">File Size</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.video_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-black/40 backdrop-blur-xl border-slate-800 overflow-hidden group hover:border-violet-500/50 transition-all duration-300">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black/60 cursor-pointer" onClick={() => handleVideoSelect(video)}>
                  {video.playback_info?.thumbnail ? (
                    <img
                      src={video.playback_info.thumbnail}
                      alt={video.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-8 h-8 text-violet-400/50" />
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-xs text-white">
                    {formatDuration(video.duration)}
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="transform scale-0 group-hover:scale-100 transition-transform duration-200">
                      <div className="w-12 h-12 rounded-full bg-violet-500/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate" title={video.file_name}>
                        {video.file_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(video.uploaded_at)}</span>
                        </div>
                        <span className="text-slate-600">•</span>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{Math.round(video.progress)}%</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-slate-800">
                        <DropdownMenuItem
                          onClick={() => handleVideoAction('download', video)}
                          className="text-slate-300 hover:text-white focus:text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleVideoAction('share', video)}
                          className="text-slate-300 hover:text-white focus:text-white"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem
                          onClick={() => handleVideoAction('delete', video)}
                          className="text-red-400 hover:text-red-300 focus:text-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-3">
                    <Badge
                      className={`
                        ${video.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          video.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            video.status === 'queued' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(video.status)}
                        <span className="capitalize">{video.status}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => setPage(prev => prev + 1)}
            className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Load More
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 mx-auto flex items-center justify-center mb-4">
            <VideoIcon className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No videos found</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery
              ? "No videos match your search criteria"
              : "Upload your first video to get started"}
          </p>
          <Button
            onClick={() => navigate('/dashboard/upload')}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Video
          </Button>
        </div>
      )}
    </div>
  );
}
