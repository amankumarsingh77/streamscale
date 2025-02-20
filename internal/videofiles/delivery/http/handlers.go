package http

import (
	"net/http"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type videoHandler struct {
	videoUC videofiles.UseCase
}

func NewVideoHandler(videoUC videofiles.UseCase) videofiles.Handler {
	return &videoHandler{
		videoUC: videoUC,
	}
}

func (h *videoHandler) GetPresignUpload() echo.HandlerFunc {
	return func(c echo.Context) error {
		input := &models.UploadInput{}
		if err := c.Bind(input); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}
		presignUrl, err := h.videoUC.GetPresignUrl(c.Request().Context(), input)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"presignUrl": presignUrl})
	}
}

func (h *videoHandler) UploadVideo() echo.HandlerFunc {
	return func(c echo.Context) error {
		input := &models.VideoUploadInput{}
		if err := c.Bind(input); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}
		presignUrl, err := h.videoUC.CreateVideo(c.Request().Context(), input)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, presignUrl)
	}
}

func (h *videoHandler) GetVideoByID() echo.HandlerFunc {
	return func(c echo.Context) error {
		videoID, err := uuid.Parse(c.Param("video_id"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid video id"})
		}
		video, err := h.videoUC.GetVideo(c.Request().Context(), videoID)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, video)
	}
}

func (h *videoHandler) ListVideos() echo.HandlerFunc {
	return func(c echo.Context) error {
		pagination, err := utils.GetPaginationFromCtx(c)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		videos, err := h.videoUC.ListVideos(c.Request().Context(), pagination)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, videos)
	}
}

func (h *videoHandler) SearchVideos() echo.HandlerFunc {
	return func(c echo.Context) error {
		query := c.QueryParam("query")
		if query == "" {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Query param is required"})
		}
		pagination, err := utils.GetPaginationFromCtx(c)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		videos, err := h.videoUC.SearchVideos(c.Request().Context(), query, pagination)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, videos)
	}
}

func (h *videoHandler) DeleteVideo() echo.HandlerFunc {
	return func(c echo.Context) error {
		videoID, err := uuid.Parse(c.Param("video_id"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid video id"})
		}
		err = h.videoUC.DeleteVideo(c.Request().Context(), videoID)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "Video deleted successfully"})
	}
}

func (h *videoHandler) UpdateVideo() echo.HandlerFunc {
	return func(c echo.Context) error {
		video := &models.VideoFile{}
		if err := c.Bind(video); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}
		err := h.videoUC.UpdateVideo(c.Request().Context(), video)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "Video updated successfully"})
	}
}

func (h *videoHandler) GetPlaybackInfo() echo.HandlerFunc {
	return func(c echo.Context) error {
		videoID, err := uuid.Parse(c.Param("video_id"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid video id"})
		}
		playbackInfo, err := h.videoUC.GetPlaybackInfo(c.Request().Context(), videoID)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, playbackInfo)
	}
}

func (h *videoHandler) CreateJob() echo.HandlerFunc {
	return func(c echo.Context) error {
		input := &models.VideoUploadInput{}
		if err := c.Bind(input); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}

		job, err := h.videoUC.CreateJob(c.Request().Context(), input)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, job)
	}
}
