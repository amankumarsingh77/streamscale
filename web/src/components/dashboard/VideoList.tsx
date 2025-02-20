import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/ui/video-player";
import { videoApi, VideoFile, PlaybackInfo } from "@/lib/videoApi";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function VideoList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
  }, [page]);

  const fetchVideos = async () => {
    try {
      setIsSearching(!!debouncedQuery);
      if (page === 1) {
        setLoading(true);
      }

      // Always fetch the main list for the grid view
      const response = await videoApi.listVideos(page);

      setVideos(prevVideos =>
        page === 1 ? response.videos : [...prevVideos, ...response.videos]
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
          const response = await videoApi.searchVideos(searchQuery, 1, 5); // Limit to 5 results in dropdown
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

  // Filter videos only by status for the main grid
  const filteredVideos = videos?.filter((video) => {
    return statusFilter === "all" || video.status === statusFilter;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
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
        // Get the highest quality HLS URL
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
    // Redirect to the player page
    navigate(`/dashboard/play/${video.video_id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent"></div>
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
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute w-full z-50 mt-[1px] bg-black/90 backdrop-blur-xl border border-t-0 border-slate-800 rounded-b-md shadow-lg max-h-[300px] overflow-y-auto">
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
                      <div
                        key={video.video_id}
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
                            <span>{Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}</span>
                            <span className="text-slate-600">•</span>
                            <span className={`capitalize ${video.status === 'completed' ? 'text-emerald-400' :
                              video.status === 'processing' ? 'text-amber-400' :
                                video.status === 'queued' ? 'text-blue-400' :
                                  'text-red-400'
                              }`}>{video.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/20 border-slate-800 text-white rounded-md px-3 py-2 flex-1 text-sm font-medium tracking-wide"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredVideos.map((video) => (
          <Card
            key={video.video_id}
            className="group bg-black/20 backdrop-blur-xl border-slate-800 hover:border-slate-700 transition-all cursor-pointer overflow-hidden"
            onClick={() => handleVideoSelect(video)}
          >
            {/* Thumbnail Container */}
            <div className="relative aspect-video">
              {video.playback_info?.thumbnail ? (
                <img
                  src={video.playback_info.thumbnail}
                  alt={video.file_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 backdrop-blur-sm flex items-center justify-center">
                  <VideoIcon className="w-8 h-8 text-violet-400/50" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-5 h-5 text-white translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-medium text-white">
                {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <div className={`px-2 py-1 rounded-md backdrop-blur-sm text-xs font-medium flex items-center gap-1.5
                  ${video.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : video.status === 'processing'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : video.status === 'queued'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {video.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                  {video.status === 'processing' && <Clock className="w-3 h-3 animate-spin" />}
                  {video.status === 'queued' && <Clock className="w-3 h-3" />}
                  {video.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                  <span className="capitalize">{video.status}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate text-sm">
                    {video.file_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(video.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 py-2 bg-black/90 backdrop-blur-xl border-slate-800"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVideoAction("download", video);
                      }}
                      className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white focus:text-white hover:bg-violet-500/10 focus:bg-violet-500/10"
                    >
                      <Download className="w-4 h-4 mr-2 text-violet-400" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVideoAction("share", video);
                      }}
                      className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white focus:text-white hover:bg-violet-500/10 focus:bg-violet-500/10"
                    >
                      <Share2 className="w-4 h-4 mr-2 text-violet-400" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2 border-t border-slate-800" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVideoAction("delete", video);
                      }}
                      className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 focus:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && !isSearching && (
        <div className="col-span-full">
          <Card className="bg-black/20 backdrop-blur-xl border-slate-800 p-8 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />

            <div className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm flex items-center justify-center mb-6 border border-violet-500/20">
                <VideoIcon className="w-12 h-12 text-violet-400" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-3">
                <span className="text-white">Welcome to </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  StreamScale Studio
                </span>
              </h2>

              <p className="text-slate-400 text-lg mb-8 max-w-2xl">
                Start your journey by uploading your first video. We'll help you process, optimize,
                and deliver your content in stunning quality.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-12">
                <Card className="p-4 bg-black/40 backdrop-blur-sm border-slate-800 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className="text-white font-medium mb-1">Easy Upload</p>
                  <p className="text-sm text-slate-400">Drag & drop or browse</p>
                </Card>

                <Card className="p-4 bg-black/40 backdrop-blur-sm border-slate-800 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className="text-white font-medium mb-1">Auto Processing</p>
                  <p className="text-sm text-slate-400">AI-powered optimization</p>
                </Card>

                <Card className="p-4 bg-black/40 backdrop-blur-sm border-slate-800 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                    <Play className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className="text-white font-medium mb-1">Instant Streaming</p>
                  <p className="text-sm text-slate-400">Ready for any device</p>
                </Card>
              </div>

              <Button
                onClick={() => navigate('/dashboard/upload')}
                className="bg-violet-600 hover:bg-violet-700 font-medium tracking-wide h-11 px-6"
              >
                Upload Your First Video
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            className="border-slate-700 text-slate-400 hover:text-white"
          >
            Load More Videos
          </Button>
        </div>
      )}
    </div>
  );
}
