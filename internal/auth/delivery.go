package auth

import "github.com/labstack/echo/v4"

type Handler interface {
	Register() echo.HandlerFunc
	Login() echo.HandlerFunc
	ResetPassword() echo.HandlerFunc
	Logout() echo.HandlerFunc
	Update() echo.HandlerFunc
	GetMe() echo.HandlerFunc
	GetUserByID() echo.HandlerFunc
	GenerateApiKey() echo.HandlerFunc
	GetUserStorageStats() echo.HandlerFunc
}
