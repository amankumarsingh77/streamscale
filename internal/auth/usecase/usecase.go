package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/auth"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
)

const (
	basePrefix    = "api-auth:"
	cacheDuration = 3600
)

type authUC struct {
	cfg      *config.Config
	authRepo auth.Repository
	logger   logger.Logger
}

func NewAuthUseCase(cfg *config.Config, authRepo auth.Repository, log logger.Logger) auth.UseCase {
	return &authUC{
		cfg:      cfg,
		authRepo: authRepo,
		logger:   log,
	}
}

func (u *authUC) Register(ctx context.Context, user *models.User) (*models.UserWithToken, error) {
	existUser, err := u.authRepo.FindByEmail(ctx, user)
	if existUser != nil || err == nil {
		return nil, fmt.Errorf("user with email %s already exists", user.Email)
	}

	if err = user.PrepareCreate(); err != nil {
		return nil, fmt.Errorf("failed to prepare user for create: %v", err)
	}
	user.APIkey = uuid.New().String()
	createUser, err := u.authRepo.Register(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}
	createUser.SanitizePassword()

	token, err := utils.GenerateJWTToken(createUser, u.cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to generate jwt token: %v", err)
	}
	return &models.UserWithToken{
		User:  createUser,
		Token: token,
	}, nil

}

func (u *authUC) Login(ctx context.Context, user *models.User) (*models.UserWithToken, error) {
	existUser, err := u.authRepo.FindByEmail(ctx, user)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user with email %s does not exist", user.Email)
		}
		return nil, fmt.Errorf("failed to find user : %v", err)
	}
	if err = existUser.ComparePassword(user.Password); err != nil {
		return nil, fmt.Errorf("invalid credentials : %v", err)
	}
	existUser.SanitizePassword()
	token, err := utils.GenerateJWTToken(existUser, u.cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to generate jwt token: %v", err)
	}
	return &models.UserWithToken{
		User:  existUser,
		Token: token,
	}, nil
}

func (u *authUC) Update(ctx context.Context, user *models.User) (*models.User, error) {
	if err := user.PrepareCreate(); err != nil {
		return nil, fmt.Errorf("failed to prepare user for update: %v", err)
	}
	updatedUser, err := u.authRepo.Update(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}
	updatedUser.SanitizePassword()

	return updatedUser, nil
}

func (u *authUC) Delete(ctx context.Context, userID uuid.UUID) error {
	if err := u.authRepo.Delete(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user: %v", err)
	}
	return nil
}

func (u *authUC) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, err := u.authRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	// can implement redis here
	user.SanitizePassword()

	return user, nil
}

func (u *authUC) GenerateApiKey(ctx context.Context, userID uuid.UUID) (string, error) {
	apiKey := uuid.New().String()
	if err := u.authRepo.CreateApiKey(ctx, apiKey, userID.String()); err != nil {
		return "", err
	}
	return apiKey, nil
}

func (u *authUC) GetUserStorageStats(ctx context.Context) (*models.StorageUsage, error) {
	user, err := utils.GetUserFromCtx(ctx)
	if err != nil {
		u.logger.Errorf("GetVideo - failed to get user from context: %v", err)
		return nil, fmt.Errorf("GetVideo - failed to get user from context:  %v", err)
	}
	storageUsage, err := u.authRepo.GetStorageUsage(ctx, user.UserID)
	if err != nil {
		u.logger.Errorf("GetStorageStats - failed to get storage stats: %v", err)
		return nil, fmt.Errorf("failed to get storage usage: %v", err)
	}
	return storageUsage, nil
}
