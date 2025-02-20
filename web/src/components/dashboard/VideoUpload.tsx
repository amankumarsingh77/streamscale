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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VideoUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'in_progress' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const durationInSeconds = Math.round(video.duration);
        console.log('Video duration:', durationInSeconds, 'seconds');
        resolve(durationInSeconds);
      };

      video.onerror = () => {
        reject('Error loading video file');
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
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      try {
        const videoDuration = await getVideoDuration(droppedFile);
        setDuration(videoDuration);
        setFile(droppedFile);
        setError(null);
      } catch (err) {
        setError('Error reading video file');
      }
    } else {
      setError('Please upload a valid video file');
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        try {
          const videoDuration = await getVideoDuration(selectedFile);
          setDuration(videoDuration);
          setFile(selectedFile);
          setError(null);
        } catch (err) {
          setError('Error reading video file');
        }
      } else {
        setError('Please upload a valid video file');
      }
    }
  };

  const handleChooseVideo = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus('uploading');
      setError(null);

      console.log('Current duration:', duration);

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
          console.log('Upload response:', xhr.status, xhr.response);
          // S3 returns 200 for successful uploads
          if (xhr.status === 200) {
            setStatus('in_progress');

            try {
              const jobParams = {
                filename: file.name,
                file_size: file.size,
                duration: duration,
                format: file.type.split('/')[1],
                qualities: [
                  {
                    resolution: "1080p",
                    bitrate: 5000000
                  }
                ],
                output_formats: ["hls"],
                enable_per_title_encoding: false
              };

              console.log('Creating job with params:', jobParams);

              await videoApi.createJob(jobParams);

              setStatus('complete');
              setTimeout(() => {
                navigate('/dashboard');
              }, 2000);
            } catch (error) {
              console.error('Error in job creation:', error);
              setStatus('error');
              setError(error instanceof Error ? error.message : 'Failed to create transcoding job');
            }
          } else {
            throw new Error(`Upload failed with status: ${xhr.status}`);
          }
        } catch (error) {
          console.error('Error in onload:', error);
          setStatus('error');
          setError(error instanceof Error ? error.message : 'Failed to process upload');
        }
      };

      xhr.onerror = (error) => {
        console.error('XHR Error:', error);
        setStatus('error');
        setError('Network error occurred during upload');
      };

      xhr.onabort = () => {
        console.log('Upload aborted');
        setStatus('error');
        setError('Upload was aborted');
      };

      if (!presignedData.presignUrl) {
        throw new Error('No upload URL provided');
      }

      xhr.open('PUT', presignedData.presignUrl, true);

      // Set required headers for S3/R2
      xhr.setRequestHeader('Content-Type', file.type);
      // Remove the x-amz-acl header as it might not be needed for R2
      // xhr.setRequestHeader('x-amz-acl', 'private');

      // Add error handling for CORS issues
      xhr.withCredentials = false; // Important for CORS with presigned URLs

      // Log the actual request
      console.log('Uploading to:', presignedData.presignUrl);
      console.log('Content-Type:', file.type);
      console.log('File size:', file.size);

      // Send the file
      xhr.send(file);

    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <span className="text-white">Upload</span>
            <span className="text-violet-400">New Video</span>
          </h1>
          <p className="text-slate-400 text-sm">Upload and process your video in one go</p>
        </div>
        <Button
          variant="link"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Upload Area */}
        <div className="lg:col-span-2">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 text-red-400 border-red-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-black/20 backdrop-blur-xl border border-dashed border-slate-800 overflow-hidden">
            {status === 'idle' && (
              <div
                className={`relative transition-colors ${isDragging
                  ? 'bg-violet-500/5 border-violet-400'
                  : 'hover:border-violet-500/50'
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
                <div className="flex flex-col items-center justify-center py-32 cursor-pointer">
                  <div className="w-16 h-16 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6">
                    <FileVideo className="w-8 h-8 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    Drag and drop your video here
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    or click to browse from your computer
                  </p>
                  <Button
                    className="bg-violet-600 hover:bg-violet-500"
                    onClick={handleChooseVideo}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Video
                  </Button>
                </div>
              </div>
            )}

            {file && status === 'idle' && (
              <div className="p-6 space-y-6">
                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">{file.name}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-500 font-medium tracking-wide h-11"
                  onClick={handleUpload}
                >
                  Start Processing
                </Button>
              </div>
            )}

            {(status === 'uploading' || status === 'in_progress') && (
              <div className="p-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm flex items-center justify-center mb-6 border border-violet-500/20">
                    {status === 'uploading' ? (
                      <Upload className="w-10 h-10 text-violet-400 animate-bounce" />
                    ) : (
                      <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {status === 'uploading' ? 'Uploading Video...' : 'Processing Video...'}
                  </h3>
                  <p className="text-slate-400 mb-8 max-w-md">
                    {status === 'uploading'
                      ? 'Your video is being uploaded. This might take a while depending on your file size and internet speed.'
                      : 'We\'re optimizing your video for streaming. This includes transcoding, thumbnail generation, and quality optimization.'}
                  </p>
                </div>

                {status === 'uploading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Upload Progress</span>
                      <span className="text-white font-medium">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-slate-500 mt-2">
                      Uploading {file?.name} ({(file?.size ? (file.size / (1024 * 1024)).toFixed(2) : 0)} MB)
                    </p>
                  </div>
                )}

                {status === 'in_progress' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-lg text-center">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
                        <Film className="w-4 h-4 text-violet-400" />
                      </div>
                      <p className="text-sm font-medium text-white">Transcoding</p>
                    </div>
                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-lg text-center">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                      </div>
                      <p className="text-sm font-medium text-white">Optimizing</p>
                    </div>
                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-lg text-center">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                      </div>
                      <p className="text-sm font-medium text-white">Securing</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'complete' && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Upload Complete!
                </h3>
                <p className="text-slate-400 mb-6">
                  Your video has been uploaded and processed successfully
                </p>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-red-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Upload Failed
                </h3>
                <p className="text-red-400 mb-6">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => setStatus('idle')}
                  className="border-slate-800 hover:bg-slate-800"
                >
                  Try Again
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar - Upload Guidelines */}
        <div className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-slate-800 p-6">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-violet-400" />
              Upload Guidelines
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Supported Formats</p>
                  <p className="text-xs text-slate-400">MP4, MOV, AVI, MKV (H.264/H.265)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Maximum File Size</p>
                  <p className="text-xs text-slate-400">Up to 2GB per video</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Resolution</p>
                  <p className="text-xs text-slate-400">Up to 4K (3840×2160)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Processing Time</p>
                  <p className="text-xs text-slate-400">2-5 minutes for most videos</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-violet-500/5 backdrop-blur-xl border-violet-500/10 p-6">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              Processing Features
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                Automatic quality optimization
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                Multiple resolution outputs
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                Thumbnail generation
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                Adaptive streaming support
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}