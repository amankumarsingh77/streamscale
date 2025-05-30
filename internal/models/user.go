package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Role string

const (
	AdminRole Role = "admin"
	UserRole  Role = "user"
)

type User struct {
	UserID       uuid.UUID `json:"user_id" db:"user_id" redis:"user_id" validate:"omitempty"`
	Username     string    `json:"username" db:"username" redis:"username" validate:"required,lte=30"`
	Email        string    `json:"email" db:"email" redis:"email" validate:"required,email,lte=60"`
	Password     string    `json:"password,omitempty" db:"password" redis:"password" validate:"required,min=8"`
	Fullname     string    `json:"fullname" db:"fullname" redis:"fullname" validate:"required,lte=30"`
	APIkey       string    `json:"api_key" db:"api_key" redis:"api_key" validate:"omitempty"`
	Role         Role      `json:"role" db:"role" redis:"role" validate:"required,oneof=admin user,lte=10"`
	StorageQuota int64     `json:"storage_quota_db" db:"storage_quota_db" redis:"storage_quota_db"`
	CreatedAt    time.Time `json:"created_at" db:"created_at" redis:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at" redis:"updated_at"`
}

type StorageUsage struct {
	TotalSize    int64
	TotalUsage   int64
	VideoCount   int
	UsagePercent float64
}

type UserWithToken struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

func (u *User) SanitizePassword() {
	u.Password = ""
}

func (u *User) HashPassword() error {
	hashedPass, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("error hashing password: %v", err)
	}
	u.Password = string(hashedPass)
	return nil
}

func (u *User) ComparePassword(password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return fmt.Errorf("error comparing password: %v", err)
	}
	return nil
}

func (u *User) PrepareCreate() error {
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))
	if !isValidEmail(u.Email) {
		return fmt.Errorf("invalid email format ")
	}

	if u.Fullname == ""{
		return fmt.Errorf("fullname is required")
	}

	u.Password = strings.TrimSpace(u.Password)
	if err := u.HashPassword(); err != nil {
		return err
	}

	if u.Role != "" {
		switch u.Role {
		case UserRole, AdminRole:

		default:
			return fmt.Errorf("invalid role: %s", u.Role)
		}
	} else {
		u.Role = UserRole
	}
	return nil
}

func isValidEmail(email string) bool {
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, err := regexp.MatchString(pattern, email)
	return err == nil && match
}
