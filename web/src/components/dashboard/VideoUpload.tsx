import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { videoApi } from "@/lib/videoApi";
import {
  Upload,
  X,
  Check,
  FileVideo,
  AlertCircle,
  ArrowLeft,
  Film,
  Clock,
  Zap,
  Shield,
  Info,
  Settings,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  VideoUploadSettings,
  VideoUploadSettings as IVideoUploadSettings,
} from "./VideoUploadSettings";

type UploadStatus = "idle" | "uploading" | "in_progress" | "complete" | "error";

export default function VideoUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadSettings, setUploadSettings] =
    useState<IVideoUploadSettings | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const durationInSeconds = Math.round(video.duration);
        resolve(durationInSeconds);
      };

      video.onerror = () => {
        reject("Error loading video file");
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      try {
        const videoDuration = await getVideoDuration(droppedFile);
        setDuration(videoDuration);
        setFile(droppedFile);
        setError(null);
      } catch (err) {
        setError("Error reading video file");
      }
    } else {
      setError("Please upload a valid video file");
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith("video/")) {
        try {
          const videoDuration = await getVideoDuration(selectedFile);
          setDuration(videoDuration);
          setFile(selectedFile);
          setError(null);
        } catch (err) {
          setError("Error reading video file");
        }
      } else {
        setError("Please upload a valid video file");
      }
    }
  };

  const handleChooseVideo = () => {
    fileInputRef.current?.click();
  };

  const handleSettingsSubmit = (settings: IVideoUploadSettings) => {
    setUploadSettings(settings);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus("uploading");
      setError(null);

      // Step 1: Get pre-signed URL
      const presignedData = await videoApi.getUploadUrl({
        name: file.name,
        mime_type: file.type,
        size: file.size,
      });

      // Step 2: Upload to S3
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      xhr.onload = async () => {
        try {
          // S3 returns 200 for successful uploads
          if (xhr.status === 200) {
            setStatus("in_progress");

            try {
              const jobParams = {
                filename: file.name,
                file_size: file.size,
                duration: duration,
                format: file.type.split("/")[1],
                codec: uploadSettings?.codec || "h264",
                qualities: uploadSettings?.qualities || [
                  {
                    resolution: "1080p",
                    bitrate: 5000000,
                  },
                ],
                output_formats: uploadSettings?.outputFormats || ["hls"],
                enable_per_title_encoding:
                  uploadSettings?.enablePerTitleEncoding || false,
              };

              await videoApi.createJob(jobParams);

              setStatus("complete");
              setTimeout(() => {
                navigate("/dashboard");
              }, 2000);
            } catch (error) {
              console.error("Error in job creation:", error);
              setStatus("error");
              setError(
                error instanceof Error
                  ? error.message
                  : "Failed to create transcoding job"
              );
            }
          } else {
            throw new Error(`Upload failed with status: ${xhr.status}`);
          }
        } catch (error) {
          console.error("Error in onload:", error);
          setStatus("error");
          setError(
            error instanceof Error ? error.message : "Failed to process upload"
          );
        }
      };

      xhr.onerror = (error) => {
        console.error("XHR Error:", error);
        setStatus("error");
        setError("Network error occurred during upload");
      };

      xhr.onabort = () => {
        setStatus("error");
        setError("Upload was aborted");
      };

      if (!presignedData.presignUrl) {
        throw new Error("No upload URL provided");
      }

      xhr.open("PUT", presignedData.presignUrl, true);

      // Set required headers for S3/R2
      xhr.setRequestHeader("Content-Type", file.type);
      // Remove the x-amz-acl header as it might not be needed for R2
      // xhr.setRequestHeader('x-amz-acl', 'private');

      // Add error handling for CORS issues
      xhr.withCredentials = false; // Important for CORS with presigned URLs

      // Send the file
      xhr.send(file);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "An error occurred during upload"
      );
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <span className="text-white">Upload</span>
            <span className="text-indigo-400">New Video</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Upload and process your video in one go
          </p>
        </div>
        <Button
          variant="link"
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Upload Area */}
        <div className="lg:col-span-2">
          {error && (
            <Alert
              variant="destructive"
              className="mb-6 bg-red-500/10 text-red-400 border-red-500/20"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-gradient-to-b from-gray-900 to-gray-950 border border-dashed border-gray-800 overflow-hidden shadow-xl">
            {status === "idle" && !file && (
              <div
                className={`relative transition-colors ${
                  isDragging
                    ? "bg-indigo-500/5 border-indigo-400"
                    : "hover:border-indigo-500/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  className="flex flex-col items-center justify-center py-32 cursor-pointer"
                  onClick={handleChooseVideo}
                >
                  <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                    <FileVideo className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Drag and drop your video here
                  </h3>
                  <p className="text-gray-400 text-sm mb-8">
                    or click to browse from your computer
                  </p>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500 h-11 px-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseVideo();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Video
                  </Button>
                </div>
              </div>
            )}

            {file && status === "idle" && (
              <div className="p-6 space-y-6">
                <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                      <FileVideo className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1 text-lg">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">
                          {Math.floor(duration / 60)}:
                          {String(Math.floor(duration % 60)).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-gray-800 hover:bg-gray-700 font-medium tracking-wide h-11 border border-gray-700"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Settings
                    </Button>

                    <Button
                      className={`flex-1 h-11 ${
                        uploadSettings
                          ? "bg-indigo-600 hover:bg-indigo-500"
                          : "bg-gray-700 cursor-not-allowed"
                      }`}
                      onClick={handleUpload}
                      disabled={!uploadSettings}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Start Upload
                    </Button>
                  </div>

                  {!uploadSettings ? (
                    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center gap-3">
                      <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <p className="text-sm text-gray-300">
                        Please configure encoding settings before uploading
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-white">
                          Selected Settings
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSettings(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 h-7 px-2"
                        >
                          Edit
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Codec:</span>
                          <span className="text-xs font-medium text-white">
                            {uploadSettings.codec.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            Qualities:
                          </span>
                          <span className="text-xs font-medium text-white">
                            {
                              uploadSettings.qualities.filter((q) => q.enabled)
                                .length
                            }{" "}
                            selected
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Format:</span>
                          <span className="text-xs font-medium text-white">
                            {uploadSettings.outputFormats
                              .map((f) => f.toUpperCase())
                              .join(", ")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            Per-Title:
                          </span>
                          <span className="text-xs font-medium text-white">
                            {uploadSettings.enablePerTitleEncoding
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === "uploading" && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    Uploading Video
                  </h3>
                  <span className="text-sm text-indigo-400">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <Progress
                  value={uploadProgress}
                  className="h-2 bg-gray-800 [&>div]:bg-indigo-500"
                />
                <p className="text-sm text-gray-400 text-center">
                  Please don't close this window during upload
                </p>
              </div>
            )}

            {status === "in_progress" && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Zap className="w-8 h-8 text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white text-center">
                  Processing Your Video
                </h3>
                <p className="text-sm text-gray-400 text-center">
                  We're encoding your video for optimal playback. This may take
                  a few minutes.
                </p>
                <div className="flex justify-center">
                  <div className="w-10 h-10 relative">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                  </div>
                </div>
              </div>
            )}

            {status === "complete" && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white text-center">
                  Upload Complete!
                </h3>
                <p className="text-sm text-gray-400 text-center">
                  Your video has been successfully processed and is ready to
                  view.
                </p>
                <div className="flex justify-center">
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500"
                    onClick={() => navigate("/dashboard")}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white text-center">
                  Upload Failed
                </h3>
                <p className="text-sm text-red-400 text-center">
                  {error ||
                    "An error occurred during upload. Please try again."}
                </p>
                <div className="flex justify-center">
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500"
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar - Upload Guidelines */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-gray-900 to-gray-950 border-gray-800 p-6 shadow-xl">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Upload Guidelines
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <Check className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Supported Formats
                  </p>
                  <p className="text-xs text-gray-400">
                    MP4, MOV, AVI, MKV (H.264/H.265)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <Check className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Maximum File Size
                  </p>
                  <p className="text-xs text-gray-400">Up to 2GB per video</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <Check className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Resolution</p>
                  <p className="text-xs text-gray-400">Up to 4K (3840×2160)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <Check className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Processing Time
                  </p>
                  <p className="text-xs text-gray-400">
                    2-5 minutes for most videos
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-indigo-500/5 backdrop-blur-xl border-indigo-500/10 p-6 shadow-xl">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Processing Features
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                Adaptive bitrate streaming
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                Multiple resolution outputs
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                Thumbnail generation
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                Advanced codec options
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <VideoUploadSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSubmit={handleSettingsSubmit}
        defaultSettings={uploadSettings || undefined}
      />
    </div>
  );
}
