import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { videoApi, VideoFile } from "@/lib/videoApi";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface AnalyticsSummary {
    totalVideos: number;
    totalViews: number;
    totalWatchTime: number;
    totalEngagement: number;
    recentVideos: VideoFile[];
    viewsGrowth: number;
    watchTimeGrowth: number;
    engagementGrowth: number;
    topPerformers: VideoFile[];
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
                const response = await videoApi.listVideos(1, 5);

                // Simulate analytics data
                setAnalytics({
                    totalVideos: response.total_count || 0,
                    totalViews: Math.floor(Math.random() * 10000),
                    totalWatchTime: Math.floor(Math.random() * 5000),
                    totalEngagement: Math.floor(Math.random() * 1000),
                    recentVideos: response.videos || [],
                    viewsGrowth: 12.5,
                    watchTimeGrowth: 8.3,
                    engagementGrowth: -2.1,
                    topPerformers: response.videos || [],
                    weeklyStats: {
                        views: Math.floor(Math.random() * 5000),
                        engagement: Math.floor(Math.random() * 500),
                        watchTime: Math.floor(Math.random() * 2000),
                    },
                    audienceRetention: 75.8,
                    shareCount: Math.floor(Math.random() * 200),
                    likes: Math.floor(Math.random() * 1500),
                });
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header with Time Range Selector */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
                    <p className="text-slate-400 mt-2">Track your content performance and audience engagement</p>
                </div>
                <div className="flex gap-2">
                    {["week", "month", "year"].map((range) => (
                        <button
                            key={range}
                            onClick={() => setSelectedTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTimeRange === range
                                ? "bg-violet-500 text-white"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Videos */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="relative overflow-hidden bg-[#1a1625] border-violet-900/50 hover:border-violet-700/50 transition-all">
                        <div className="p-6 bg-gradient-to-br from-violet-900/50 via-violet-800/30 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-violet-900/50 flex items-center justify-center shadow-lg shadow-violet-900/20">
                                    <PlayCircle className="w-6 h-6 text-violet-300" />
                                </div>
                                <span className="text-xs font-medium text-violet-300 bg-violet-900/50 px-3 py-1 rounded-full shadow-lg">
                                    Total Videos
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold text-white mb-2">{formatNumber(analytics.totalVideos)}</h2>
                                <div className="flex items-center gap-2 text-violet-300">
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span className="text-sm">+12% from last {selectedTimeRange}</span>
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
                    <Card className="relative overflow-hidden bg-[#162521] border-emerald-900/50 hover:border-emerald-700/50 transition-all">
                        <div className="p-6 bg-gradient-to-br from-emerald-900/50 via-emerald-800/30 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-900/50 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                                    <Eye className="w-6 h-6 text-emerald-300" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-900/50 px-3 py-1 rounded-full shadow-lg">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {analytics.viewsGrowth}%
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold text-white mb-2">{formatNumber(analytics.totalViews)}</h2>
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
                    <Card className="relative overflow-hidden bg-[#151e29] border-blue-900/50 hover:border-blue-700/50 transition-all">
                        <div className="p-6 bg-gradient-to-br from-blue-900/50 via-blue-800/30 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-900/50 flex items-center justify-center shadow-lg shadow-blue-900/20">
                                    <Timer className="w-6 h-6 text-blue-300" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full shadow-lg">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {analytics.watchTimeGrowth}%
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold text-white mb-2">{formatDuration(analytics.totalWatchTime)}</h2>
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
                    <Card className="relative overflow-hidden bg-[#291b15] border-amber-900/50 hover:border-amber-700/50 transition-all">
                        <div className="p-6 bg-gradient-to-br from-amber-900/50 via-amber-800/30 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-900/50 flex items-center justify-center shadow-lg shadow-amber-900/20">
                                    <Zap className="w-6 h-6 text-amber-300" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-900/50 px-3 py-1 rounded-full shadow-lg">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {Math.abs(analytics.engagementGrowth)}%
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold text-white mb-2">{formatNumber(analytics.totalEngagement)}</h2>
                                <p className="text-sm text-amber-300">Engagement Score</p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Weekly Performance */}
                <Card className="col-span-2 bg-black/40 backdrop-blur-xl border-slate-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <LineChart className="w-5 h-5 text-violet-400" />
                                Performance Metrics
                            </h2>
                            <button className="text-sm text-slate-400 hover:text-white transition-colors">
                                View Details
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-slate-800/50">
                                <p className="text-sm text-slate-400 mb-1">Weekly Views</p>
                                <h3 className="text-2xl font-bold text-white">{formatNumber(analytics.weeklyStats.views)}</h3>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-800/50">
                                <p className="text-sm text-slate-400 mb-1">Engagement Rate</p>
                                <h3 className="text-2xl font-bold text-white">{formatNumber(analytics.weeklyStats.engagement)}</h3>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-800/50">
                                <p className="text-sm text-slate-400 mb-1">Watch Minutes</p>
                                <h3 className="text-2xl font-bold text-white">{formatNumber(analytics.weeklyStats.watchTime)}</h3>
                            </div>
                        </div>
                        {/* Placeholder for Chart */}
                        <div className="mt-6 h-64 bg-slate-800/30 rounded-lg flex items-center justify-center">
                            <BarChart className="w-8 h-8 text-slate-600" />
                        </div>
                    </div>
                </Card>

                {/* Audience Insights */}
                <Card className="bg-black/40 backdrop-blur-xl border-slate-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-400" />
                                Audience Insights
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-slate-800/50">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-slate-400">Retention Rate</p>
                                    <span className="text-emerald-400">{analytics.audienceRetention}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${analytics.audienceRetention}%` }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-slate-800/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Share2 className="w-4 h-4 text-blue-400" />
                                        <p className="text-sm text-slate-400">Shares</p>
                                    </div>
                                    <h4 className="text-xl font-bold text-white">{formatNumber(analytics.shareCount)}</h4>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-800/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ThumbsUp className="w-4 h-4 text-pink-400" />
                                        <p className="text-sm text-slate-400">Likes</p>
                                    </div>
                                    <h4 className="text-xl font-bold text-white">{formatNumber(analytics.likes)}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Videos Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Videos */}
                <Card className="bg-black/40 backdrop-blur-xl border-slate-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <PlayCircle className="w-5 h-5 text-violet-400" />
                                Recent Videos
                            </h2>
                            <button
                                onClick={() => navigate('/dashboard/videos')}
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
                                    onClick={() => navigate(`/dashboard/play/${video.video_id}`)}
                                >
                                    <div className="w-24 h-14 bg-black/40 rounded-md overflow-hidden flex-shrink-0">
                                        {video.playback_info?.thumbnail ? (
                                            <img
                                                src={video.playback_info.thumbnail}
                                                alt={video.file_name}
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
                                            {video.file_name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{new Date(video.uploaded_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                <span>{formatNumber(Math.floor(Math.random() * 1000))} views</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`
                                        px-2 py-1 rounded-full text-xs font-medium
                                        ${video.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                            video.status === 'processing' ? 'bg-amber-500/10 text-amber-400' :
                                                video.status === 'queued' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-red-500/10 text-red-400'
                                        }
                                    `}>
                                        {video.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Top Performing Videos */}
                <Card className="bg-black/40 backdrop-blur-xl border-slate-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-violet-400" />
                                Top Performing
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {analytics.topPerformers.slice(0, 4).map((video, index) => (
                                <div
                                    key={video.video_id}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/dashboard/play/${video.video_id}`)}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 font-semibold">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-white truncate">
                                            {video.file_name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {formatNumber(Math.floor(Math.random() * 10000))}
                                            </span>
                                            <span className="text-xs text-blue-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDuration(Math.floor(Math.random() * 120))}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                                        <ArrowUpRight className="w-4 h-4" />
                                        {Math.floor(Math.random() * 40 + 10)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
} 