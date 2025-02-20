package repository

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/auth"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type authRepo struct {
	db *sqlx.DB
}

func NewAuthRepo(db *sqlx.DB) auth.Repository {
	return &authRepo{
		db: db,
	}
}

func (a *authRepo) Register(ctx context.Context, user *models.User) (*models.User, error) {
	u := &models.User{}
	err := a.db.QueryRowxContext(
		ctx,
		createUser,
		&user.Fullname,
		&user.Email,
		&user.Password,
		&user.Username,
		&user.Role,
		&user.APIkey,
	).StructScan(u)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}
	return u, nil
}

func (a *authRepo) Update(ctx context.Context, user *models.User) (*models.User, error) {
	u := &models.User{}
	if err := a.db.GetContext(
		ctx,
		u,
		updateUser,
		&user.Fullname,
		&user.Email,
		&user.Role,
		&user.UserID,
	); err != nil {
		return nil, fmt.Errorf("failed to update user : %v", err)
	}
	return u, nil
}

func (a *authRepo) Delete(ctx context.Context, userID uuid.UUID) error {
	result, err := a.db.ExecContext(
		ctx,
		deleteUserQuery,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete user %v : ", err)
	}
	rowsEffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rowsaffected %v", err)
	}
	if rowsEffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (a *authRepo) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	u := &models.User{}
	if err := a.db.QueryRowxContext(
		ctx,
		getUserQuery,
		userID,
	).StructScan(u); err != nil {
		return nil, fmt.Errorf("failed to get user : %v", err)
	}
	return u, nil
}

func (a *authRepo) FindByEmail(ctx context.Context, user *models.User) (*models.User, error) {
	u := &models.User{}

	if err := a.db.QueryRowxContext(
		ctx,
		getUserByEmail,
		&user.Email,
	).StructScan(u); err != nil {
		return nil, fmt.Errorf("failed to get user :%v", err)
	}
	return u, nil
}

func (a *authRepo) CreateApiKey(ctx context.Context, apiKey string, userID string) error {
	_, err := a.db.ExecContext(
		ctx,
		createApiKey,
		apiKey,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to create api key : %v", err)
	}
	return nil
}

func (a *authRepo) GetStorageUsage(ctx context.Context, userID uuid.UUID) (*models.StorageUsage, error) {
	// Not the best way to do it, but I am just very lazy to update the schema now ;)
	storageUsage := &models.StorageUsage{}
	if err := a.db.QueryRowxContext(
		ctx,
		getStorageUsageQuery,
		userID,
	).StructScan(storageUsage); err != nil {
		return nil, fmt.Errorf("failed to get storage usage: %w", err)
	}
	return storageUsage, nil
}
