package videofiles

import "github.com/labstack/echo/v4"

type Handler interface {
	GetPresignUpload() echo.HandlerFunc
	UploadVideo() echo.HandlerFunc
	ListVideos() echo.HandlerFunc
	GetVideoByID() echo.HandlerFunc
	DeleteVideo() echo.HandlerFunc
	GetPlaybackInfo() echo.HandlerFunc
	SearchVideos() echo.HandlerFunc
	UpdateVideo() echo.HandlerFunc
	CreateJob() echo.HandlerFunc

	//GetVideoThumbnail() echo.HandlerFunc  // Coming soon ;)
}
