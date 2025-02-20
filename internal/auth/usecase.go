package auth

import (
	"context"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/google/uuid"
)

type UseCase interface {
	Register(ctx context.Context, user *models.User) (*models.UserWithToken, error)
	Login(ctx context.Context, user *models.User) (*models.UserWithToken, error)
	Update(ctx context.Context, user *models.User) (*models.User, error)
	Delete(ctx context.Context, userID uuid.UUID) error
	GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GenerateApiKey(ctx context.Context, userID uuid.UUID) (string, error)
	GetUserStorageStats(ctx context.Context) (*models.StorageUsage, error)
}
