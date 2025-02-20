package http

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/middleware"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/labstack/echo/v4"
)

func MapVideoRoutes(videoGroup *echo.Group, h videofiles.Handler, mw *middleware.MiddlewareManager) {
	videoGroup.Use(mw.AuthSessionMiddleware)
	videoGroup.POST("/get-upload-url", h.GetPresignUpload())
	videoGroup.POST("/upload", h.UploadVideo())
	videoGroup.GET("/:video_id", h.GetVideoByID())
	videoGroup.GET("/list-videos", h.ListVideos())
	videoGroup.GET("/search", h.SearchVideos())
	videoGroup.DELETE("/:video_id", h.DeleteVideo())
	videoGroup.PUT("/:video_id", h.UpdateVideo())
	videoGroup.GET("/:video_id/playback-info", h.GetPlaybackInfo())
	videoGroup.POST("/create-job", h.CreateJob())
}
