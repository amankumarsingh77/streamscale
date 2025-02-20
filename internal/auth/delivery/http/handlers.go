package http

import (
	"net/http"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/session"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/httpErrors"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/auth"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type authHandler struct {
	cfg    *config.Config
	authUc auth.UseCase
	sessUC session.UCSession
	logger logger.Logger
}

func NewAuthHandler(cfg *config.Config, authUc auth.UseCase, sessUC session.UCSession, logger logger.Logger) auth.Handler {
	return &authHandler{
		cfg:    cfg,
		authUc: authUc,
		sessUC: sessUC,
		logger: logger,
	}
}

func (h *authHandler) Register() echo.HandlerFunc {
	return func(c echo.Context) error {
		user := &models.User{}
		if err := c.Bind(user); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}

		createdUser, err := h.authUc.Register(c.Request().Context(), user)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		sess, err := h.sessUC.CreateSession(c.Request().Context(), &models.Session{
			UserID: createdUser.User.UserID,
		}, h.cfg.Session.Expire)
		if err != nil {
			return c.JSON(httpErrors.ErrorResponse(err))
		}

		c.SetCookie(utils.CreateSessionCookie(h.cfg, sess))
		return c.JSON(http.StatusCreated, createdUser)
	}
}

func (h *authHandler) Login() echo.HandlerFunc {
	return func(c echo.Context) error {
		var loginInput struct {
			Email    string `json:"email" validate:"required,email"`
			Password string `json:"password" validate:"required"`
		}

		if err := c.Bind(&loginInput); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "invalid request payload",
			})
		}

		if err := utils.ValidateStruct(c.Request().Context(), &loginInput); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		}

		user := &models.User{
			Email:    loginInput.Email,
			Password: loginInput.Password,
		}

		userWithToken, err := h.authUc.Login(c.Request().Context(), user)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": err.Error(),
			})
		}

		// Set cookie for web clients
		sess, err := h.sessUC.CreateSession(c.Request().Context(), &models.Session{
			UserID: userWithToken.User.UserID,
		}, h.cfg.Session.Expire)
		if err != nil {
			return c.JSON(httpErrors.ErrorResponse(err))
		}

		c.SetCookie(utils.CreateSessionCookie(h.cfg, sess))

		return c.JSON(http.StatusOK, userWithToken)
	}
}

func (h *authHandler) GetMe() echo.HandlerFunc {
	return func(c echo.Context) error {
		user, ok := c.Get("user").(*models.User)
		if !ok {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized access"})
		}
		return c.JSON(http.StatusOK, user)
	}
}

// TODO Implement reset password
func (h *authHandler) ResetPassword() echo.HandlerFunc {
	return func(c echo.Context) error {
		return c.JSON(http.StatusOK, "Reset Password")
	}
}

func (h *authHandler) Logout() echo.HandlerFunc {
	return func(c echo.Context) error {
		cookie := new(http.Cookie)
		cookie.Name = "jwt-token"
		cookie.Value = ""
		cookie.Expires = time.Now().Add(-time.Hour)
		cookie.HttpOnly = true
		cookie.Secure = true
		cookie.SameSite = http.SameSiteStrictMode
		c.SetCookie(cookie)

		return c.JSON(http.StatusOK, map[string]string{
			"message": "successfully logged out",
		})
	}
}

func (h *authHandler) Update() echo.HandlerFunc {
	return func(c echo.Context) error {
		user := &models.User{}
		if err := c.Bind(user); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		}

		updateUser, err := h.authUc.Update(c.Request().Context(), user)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, updateUser)
	}
}

//func (h *authHandler) DeactivateUser() echo.HandlerFunc {
//	return func(c echo.Context) error {
//		userID, err := uuid.Parse(c.Param("id"))
//		if err != nil {
//			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user id"})
//		}
//		err = h.authUc.Delete(c.Request().Context(), userID)
//		if err != nil {
//			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
//		}
//		return c.JSON(http.StatusOK, map[string]string{"message": "User deleted successfully"})
//	}
//}

func (h *authHandler) GetUserByID() echo.HandlerFunc {
	return func(c echo.Context) error {

		uID, err := uuid.Parse(c.Param("user_id"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user id"})
		}

		user, err := h.authUc.GetByID(c.Request().Context(), uID)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, user)
	}
}

func (h *authHandler) GetUserStorageStats() echo.HandlerFunc {
	return func(c echo.Context) error {
		stats, err := h.authUc.GetUserStorageStats(c.Request().Context())
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, stats)
	}
}

func (h *authHandler) GenerateApiKey() echo.HandlerFunc {
	return func(c echo.Context) error {
		user, ok := c.Get("user").(*models.User)
		if !ok {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized access"})
		}
		apikey, err := h.authUc.GenerateApiKey(c.Request().Context(), user.UserID)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"apikey": apikey})
	}
}
