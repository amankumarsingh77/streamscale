import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { videoApi, VideoFile } from "@/lib/videoApi";
import {
  analyticsApi,
  AnalyticsSummary as ApiAnalyticsSummary,
  VideoPerformance,
} from "@/lib/analyticsApi";
import { useAuth } from "@/lib/auth";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Eye,
  PlayCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Zap,
  Timer,
  Share2,
  ThumbsUp,
  BarChart,
  PieChart,
  LineChart,
  Upload,
  Sparkles,
  FileVideo,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface AnalyticsSummary {
  totalVideos: number;
  totalViews: number;
  totalWatchTime: number;
  totalEngagement: number;
  recentVideos: VideoPerformance[];
  viewsGrowth: number;
  watchTimeGrowth: number;
  engagementGrowth: number;
  topPerformers: VideoPerformance[];
  weeklyStats: {
    views: number;
    engagement: number;
    watchTime: number;
  };
  audienceRetention: number;
  shareCount: number;
  likes: number;
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalVideos: 0,
    totalViews: 0,
    totalWatchTime: 0,
    totalEngagement: 0,
    recentVideos: [],
    viewsGrowth: 0,
    watchTimeGrowth: 0,
    engagementGrowth: 0,
    topPerformers: [],
    weeklyStats: {
      views: 0,
      engagement: 0,
      watchTime: 0,
    },
    audienceRetention: 0,
    shareCount: 0,
    likes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch analytics summary from the API
        const analyticsSummary = await analyticsApi.getAnalyticsSummary();

        // Fetch top performing videos
        const topVideos = await analyticsApi.getTopPerformingVideos(5);

        // Fetch recent videos with performance metrics
        const recentVideos = await analyticsApi.getRecentVideos(5);

        // Calculate growth percentages (comparing to previous period)
        // For demo purposes, we'll use some reasonable values
        const viewsGrowth = 12.5;
        const watchTimeGrowth = 8.3;
        const engagementGrowth = -2.1;

        // Calculate weekly stats (last 7 days)
        const weeklyViews = topVideos.reduce(
          (sum, video) => sum + video.views_last_7_days,
          0
        );
        const weeklyWatchTime = topVideos.reduce(
          (sum, video) => sum + video.watch_time_last_7_days,
          0
        );

        // Calculate average engagement score for weekly stats
        const weeklyEngagement =
          topVideos.length > 0
            ? topVideos.reduce(
                (sum, video) => sum + video.engagement_score,
                0
              ) / topVideos.length
            : 0;

        // Set analytics state with real data
        setAnalytics({
          totalVideos: analyticsSummary.total_videos,
          totalViews: analyticsSummary.total_views,
          totalWatchTime: analyticsSummary.total_watch_time,
          totalEngagement: Math.round(
            analyticsSummary.avg_engagement_score * 10
          ), // Scale for display
          recentVideos: recentVideos,
          viewsGrowth: viewsGrowth,
          watchTimeGrowth: watchTimeGrowth,
          engagementGrowth: engagementGrowth,
          topPerformers: topVideos,
          weeklyStats: {
            views: weeklyViews,
            engagement: Math.round(weeklyEngagement),
            watchTime: weeklyWatchTime,
          },
          // For demo purposes, we'll use some reasonable values for these metrics
          // In a real implementation, these would come from the API
          audienceRetention: 75.8,
          shareCount: Math.floor(analyticsSummary.total_views * 0.02), // Assume 2% share rate
          likes: Math.floor(analyticsSummary.total_views * 0.15), // Assume 15% like rate
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);

        // Fallback to fetching just the videos if analytics API fails
        try {
          const response = await videoApi.listVideos(1, 5);
          setAnalytics({
            totalVideos: response.total_count || 0,
            totalViews: 0,
            totalWatchTime: 0,
            totalEngagement: 0,
            recentVideos: [],
            viewsGrowth: 0,
            watchTimeGrowth: 0,
            engagementGrowth: 0,
            topPerformers: [],
            weeklyStats: {
              views: 0,
              engagement: 0,
              watchTime: 0,
            },
            audienceRetention: 0,
            shareCount: 0,
            likes: 0,
          });
        } catch (videoError) {
          console.error("Error fetching videos:", videoError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedTimeRange]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-[14px] bg-[#0f1729] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-400">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Track your content performance and audience engagement
          </p>
        </div>
        <div className="flex gap-2">
          {["week", "month", "year"].map((range) => (
            <Button
              key={range}
              variant={selectedTimeRange === range ? "default" : "outline"}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium ${
                selectedTimeRange === range
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
                  : "bg-[#0f1729]/50 border-slate-800/60 text-slate-300 hover:bg-indigo-500/10 hover:text-white hover:border-indigo-500/50"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Welcome Card */}
      {analytics.totalVideos === 0 && (
        <Card className="bg-gradient-to-br from-[#2c245d] via-[#3b2a82] to-[#4b2071] border border-violet-700/30 shadow-xl rounded-2xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/40 to-violet-500/40 flex items-center justify-center border border-indigo-400/30 shadow-lg">
                <FileVideo className="w-8 h-8 text-indigo-300" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Welcome to{" "}
                  <span className="text-indigo-300">StreamScale</span>
                  {user?.name ? `, ${user.name}` : ""}!
                </h3>
                <p className="text-slate-300 text-sm mb-5 max-w-md mx-auto md:mx-0">
                  Start by uploading a video — we'll handle the processing and
                  streaming.
                </p>
                <Button
                  onClick={() => navigate("/dashboard/upload")}
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-medium px-5 py-2 rounded-lg shadow-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      {analytics.totalVideos > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Videos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden bg-[#0f1729]/80 border-indigo-900/30 hover:border-indigo-700/50 transition-all shadow-lg">
              <div className="p-6 bg-gradient-to-br from-indigo-900/20 via-indigo-800/10 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 flex items-center justify-center shadow-lg shadow-indigo-900/10">
                    <PlayCircle className="w-6 h-6 text-indigo-300" />
                  </div>
                  <span className="text-xs font-medium text-indigo-300 bg-indigo-900/30 px-3 py-1 rounded-full shadow-lg">
                    Total Videos
                  </span>
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {formatNumber(analytics.totalVideos)}
                  </h2>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm">
                      +12% from last {selectedTimeRange}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Total Views */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden bg-[#0f1729]/80 border-emerald-900/30 hover:border-emerald-700/50 transition-all shadow-lg">
              <div className="p-6 bg-gradient-to-br from-emerald-900/20 via-emerald-800/10 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 flex items-center justify-center shadow-lg shadow-emerald-900/10">
                    <Eye className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-900/30 px-3 py-1 rounded-full shadow-lg">
                    <ArrowUpRight className="w-3 h-3" />
                    {analytics.viewsGrowth}%
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {formatNumber(analytics.totalViews)}
                  </h2>
                  <p className="text-sm text-emerald-300">Total Views</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Watch Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden bg-[#0f1729]/80 border-blue-900/30 hover:border-blue-700/50 transition-all shadow-lg">
              <div className="p-6 bg-gradient-to-br from-blue-900/20 via-blue-800/10 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-900/30 flex items-center justify-center shadow-lg shadow-blue-900/10">
                    <Timer className="w-6 h-6 text-blue-300" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-900/30 px-3 py-1 rounded-full shadow-lg">
                    <ArrowUpRight className="w-3 h-3" />
                    {analytics.watchTimeGrowth}%
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {formatDuration(analytics.totalWatchTime)}
                  </h2>
                  <p className="text-sm text-blue-300">Watch Time</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Engagement Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden bg-[#0f1729]/80 border-amber-900/30 hover:border-amber-700/50 transition-all shadow-lg">
              <div className="p-6 bg-gradient-to-br from-amber-900/20 via-amber-800/10 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-900/30 flex items-center justify-center shadow-lg shadow-amber-900/10">
                    <Zap className="w-6 h-6 text-amber-300" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-900/30 px-3 py-1 rounded-full shadow-lg">
                    <ArrowUpRight className="w-3 h-3" />
                    {Math.abs(analytics.engagementGrowth)}%
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {formatNumber(analytics.totalEngagement)}
                  </h2>
                  <p className="text-sm text-amber-300">Engagement Score</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Secondary Stats Grid */}
      {analytics.totalVideos > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Weekly Performance */}
          <Card className="col-span-2 bg-[#0f1729]/40 backdrop-blur-xl border-slate-800/60 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-indigo-400" />
                  Performance Metrics
                </h2>
                <button className="text-sm text-slate-400 hover:text-white transition-colors">
                  View Details
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                  <p className="text-sm text-slate-400 mb-1">Weekly Views</p>
                  <h3 className="text-2xl font-bold text-white">
                    {formatNumber(analytics.weeklyStats.views)}
                  </h3>
                </div>
                <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                  <p className="text-sm text-slate-400 mb-1">Engagement Rate</p>
                  <h3 className="text-2xl font-bold text-white">
                    {formatNumber(analytics.weeklyStats.engagement)}
                  </h3>
                </div>
                <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                  <p className="text-sm text-slate-400 mb-1">Watch Minutes</p>
                  <h3 className="text-2xl font-bold text-white">
                    {formatNumber(analytics.weeklyStats.watchTime)}
                  </h3>
                </div>
              </div>
              {/* Placeholder for Chart */}
              <div className="mt-6 h-64 bg-[#0f1729]/60 rounded-lg flex items-center justify-center border border-slate-800/40">
                <div className="text-center">
                  <BarChart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Performance chart will appear here
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Audience Insights */}
          <Card className="bg-[#0f1729]/40 backdrop-blur-xl border-slate-800/60 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Audience Insights
                </h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Retention Rate</p>
                    <span className="text-emerald-400">
                      {analytics.audienceRetention}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#0f1729]/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${analytics.audienceRetention}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-slate-400">Shares</p>
                    </div>
                    <h4 className="text-xl font-bold text-white">
                      {formatNumber(analytics.shareCount)}
                    </h4>
                  </div>
                  <div className="p-4 rounded-lg bg-[#0f1729]/60 border border-slate-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp className="w-4 h-4 text-pink-400" />
                      <p className="text-sm text-slate-400">Likes</p>
                    </div>
                    <h4 className="text-xl font-bold text-white">
                      {formatNumber(analytics.likes)}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Videos Section */}
      {analytics.totalVideos > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Videos */}
          <Card className="bg-[#0f1729]/40 backdrop-blur-xl border-slate-800/60 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-indigo-400" />
                  Recent Videos
                </h2>
                <button
                  onClick={() => navigate("/dashboard/videos")}
                  className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {analytics.recentVideos.slice(0, 4).map((video) => (
                  <div
                    key={video.video_id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/dashboard/play/${video.video_id}`)
                    }
                  >
                    <div className="w-24 h-14 bg-black/40 rounded-md overflow-hidden flex-shrink-0">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(video.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{formatNumber(video.total_views)} views</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                      {formatNumber(video.engagement_score)}% engagement
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Top Performing Videos */}
          <Card className="bg-[#0f1729]/40 backdrop-blur-xl border-slate-800/60 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Top Performing
                </h2>
              </div>
              <div className="space-y-4">
                {analytics.topPerformers.slice(0, 4).map((video, index) => (
                  <div
                    key={video.video_id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/dashboard/play/${video.video_id}`)
                    }
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-semibold">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(video.total_views)}
                        </span>
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(
                            video.total_watch_time / video.total_views
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      {video.engagement_score.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
