/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axiosConfig';
import { setTokens, clearTokens } from '../api/tokenStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Ahora sí la usaremos

  const performLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    clearTokens();
  }, []);

  useEffect(() => {
    const handleForceLogout = () => performLogout();
    window.addEventListener('auth:logout', handleForceLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleForceLogout);
    };
  }, [performLogout]);

  const login = async (email, password) => {
    setIsLoading(true); // 1. Iniciamos la carga
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      
      setTokens(accessToken, refreshToken);
      setUser(userData);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false); // 2. Finalizamos la carga sin importar si hubo error o éxito
    }
  };

  const logout = async () => {
    setIsLoading(true); // 1. Iniciamos la carga
    try {
      const { refreshToken } = await import('../api/tokenStore').then(m => m.getTokens());
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error("Error al hacer logout:", error);
    } finally {
      performLogout();
      setIsLoading(false); // 2. Finalizamos la carga
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};