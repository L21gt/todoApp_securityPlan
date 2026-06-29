import { useState, useCallback } from "react";
import DOMPurify from "dompurify";

export const useSecureSubmit = (apiFunction) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (formData) => {
      setIsLoading(true);
      setError(null);

      try {
        const sanitizedData = {};
        if (formData) {
          for (const key in formData) {
            if (typeof formData[key] === "string") {
              sanitizedData[key] = DOMPurify.sanitize(formData[key].trim());
            } else {
              sanitizedData[key] = formData[key];
            }
          }
        }

        const response = await apiFunction(sanitizedData);
        setIsLoading(false);
        return { success: true, data: response.data };
      } catch (err) {
        setIsLoading(false);
        let errorMessage = "Ocurrió un error en el servidor.";
        if (err.response) {
          const { status, data, headers } = err.response;
          switch (status) {
            case 401:
              errorMessage =
                data.error || "Credenciales inválidas o sesión expirada.";
              // ✅ FIX: Solo redirigimos si NO estamos intentando hacer login
              if (err.config && !err.config.url.includes("/login")) {
                window.location.href = "/login";
              }
              break;
            case 403:
              errorMessage = data.error || "Acceso denegado.";
              break;
            case 422:
            case 400:
              errorMessage = data.error || "Datos inválidos.";
              break;
            case 429: {
              const retryAfter = headers["retry-after"] || "unos";
              errorMessage = `Demasiados intentos. Espera ${retryAfter} segundos.`;
              break;
            }
            default:
              errorMessage = data.error || "Error de conexión.";
          }
        }
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [apiFunction],
  );

  return { execute, isLoading, error, setError };
};
