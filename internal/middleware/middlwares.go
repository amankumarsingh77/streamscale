package middleware

import (
	"github.com/amankumarsingh77/cloud-video-encoder/internal/auth"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/session"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
)

type MiddlewareManager struct {
	authUC  auth.UseCase
	sessUC  session.UCSession
	cfg     *config.Config
	origins []string
	logger  logger.Logger
}

// Middleware manager constructor
func NewMiddlewareManager(authUC auth.UseCase, cfg *config.Config, origins []string, sessUC session.UCSession, logger logger.Logger) *MiddlewareManager {
	return &MiddlewareManager{authUC: authUC, cfg: cfg, origins: origins, sessUC: sessUC, logger: logger}
}
