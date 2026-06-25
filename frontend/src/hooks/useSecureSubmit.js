import { useState } from "react";
import DOMPurify from "dompurify";

export const useSecureSubmit = (apiFunction) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Sanitización de inputs estricta con DOMPurify (Requisito de Seguridad)
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

      // 2. Ejecutar la llamada a la API con la data limpia
      const response = await apiFunction(sanitizedData);
      setIsLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      setIsLoading(false);

      // 3. Manejo de errores específicos requeridos por la rúbrica
      let errorMessage = "Ocurrió un error en el servidor.";

      if (err.response) {
        const { status, data, headers } = err.response;

        switch (status) {
          case 401:
            errorMessage =
              data.error ||
              data.message ||
              "Credenciales inválidas o sesión expirada.";
            break;
          case 403:
            errorMessage = data.error || "Acceso denegado: No tienes permisos.";
            break;
          case 422:
          case 400: // Validación de Joi
            errorMessage =
              data.error ||
              (data.details && data.details.join(", ")) ||
              "Datos inválidos.";
            break;
          case 429: {
            // Fix: Envolvemos en llaves {} para crear un block scope y aislar la constante
            const retryAfter = headers["retry-after"] || "unos";
            errorMessage = `Demasiados intentos. Por favor espera ${retryAfter} segundos.`;
            break;
          }
          case 409:
            errorMessage =
              data.error || "El registro ya existe (ej. correo duplicado).";
            break;
          default:
            errorMessage = data.error || "Error de conexión con el servidor.";
        }
      } else if (err.request) {
        errorMessage = "El servidor no responde. Verifica tu conexión.";
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return { execute, isLoading, error, setError };
};
