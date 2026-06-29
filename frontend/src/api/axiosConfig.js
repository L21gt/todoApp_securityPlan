import axios from "axios";
import { getTokens, setTokens, clearTokens } from "./tokenStore";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = getTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // ✅ FIX 1: Si el 401 viene de intentar iniciar sesión, NO redirigimos, dejamos que el frontend muestre el error.
      if (originalRequest.url.includes("/login")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const { refreshToken } = getTokens();

      // Escenario 1: No hay refresh token disponible
      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          "http://localhost:3000/api/auth/refresh",
          {
            refreshToken,
          },
        );

        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken || refreshToken;

        setTokens(newAccessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Escenario 2: El refresh token también expiró o es inválido
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
        window.location.href = "/login"; // ✅ Redirección forzada e inmediata
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
