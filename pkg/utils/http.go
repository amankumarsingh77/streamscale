package utils

import (
	"context"
	"fmt"
	"net/http"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/labstack/echo/v4"
)

// UserCtxKey is the type for the user context key
type UserCtxKey struct{}

// CtxUserKey is the singleton instance for user context
var CtxUserKey = UserCtxKey{}

func GetUserFromCtx(ctx context.Context) (*models.User, error) {
	user, ok := ctx.Value(CtxUserKey).(*models.User)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return user, nil
}

func GetRequestID(c echo.Context) string {
	return c.Response().Header().Get(echo.HeaderXRequestID)
}

func GetIPAddress(c echo.Context) string {
	return c.Request().RemoteAddr
}

func CreateSessionCookie(cfg *config.Config, session string) *http.Cookie {
	return &http.Cookie{
		Name:  cfg.Session.Name,
		Value: session,
		Path:  "/",
		// Domain: "/",
		// Expires:    time.Now().Add(1 * time.Minute),
		RawExpires: "",
		MaxAge:     cfg.Session.Expire,
		Secure:     cfg.Cookie.Secure,
		HttpOnly:   cfg.Cookie.HTTPOnly,
		SameSite:   0,
	}
}
