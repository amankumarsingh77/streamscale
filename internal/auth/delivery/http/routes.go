package http

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/auth"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/middleware"
	"github.com/labstack/echo/v4"
)

func MapAuthRoutes(authGroup *echo.Group, h auth.Handler, mw *middleware.MiddlewareManager, authUC auth.UseCase, cfg *config.Config) {
	authGroup.POST("/register", h.Register())
	authGroup.POST("/login", h.Login())
	authGroup.POST("/logout", h.Logout())
	authGroup.GET("/:user_id", h.GetUserByID(), mw.OwnerOrAdminMiddleware())
	authGroup.Use(mw.AuthSessionMiddleware)
	//authGroup.Use(mw.AuthJWTMiddleware(authUC, cfg))
	authGroup.GET("/me", h.GetMe())
	authGroup.PUT("/:user_id", h.Update(), mw.OwnerOrAdminMiddleware())
	authGroup.GET("/user/storage/stats", h.GetUserStorageStats())
	//authGroup.DELETE("/:user_id", h.GetUserByID()))
}
