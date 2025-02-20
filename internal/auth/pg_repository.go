package auth

import (
	"context"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/google/uuid"
)

type Repository interface {
	Register(ctx context.Context, user *models.User) (*models.User, error)
	Update(ctx context.Context, user *models.User) (*models.User, error)
	Delete(ctx context.Context, userID uuid.UUID) error
	GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, user *models.User) (*models.User, error)
	CreateApiKey(ctx context.Context, apiKey string, userID string) error
	GetStorageUsage(ctx context.Context, userID uuid.UUID) (*models.StorageUsage, error)
}
