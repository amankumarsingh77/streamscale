import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // This is crucial for sending/receiving cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    console.error("API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Don't handle errors for auth endpoints to prevent logout loops
    const isAuthEndpoint = error.config?.url?.includes("/auth/");
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      console.log("Unauthorized, redirecting to login");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  register: async (
    email: string,
    password: string,
    fullname: string,
    username: string
  ) => {
    try {
      const response = await api.post("/auth/register", {
        email,
        password,
        fullname,
        username,
      });
      return response.data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },
  logout: async () => {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      console.error("Get current user error:", error);
      throw error;
    }
  },
};
