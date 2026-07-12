import { isAxiosError } from 'axios';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { documentsApi } from '../api/documents';
import { authApi } from '../api/auth';

import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (formData: URLSearchParams) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // If we can fetch documents, we are authenticated
      await documentsApi.list();
      setIsAuthenticated(true);
    } catch (requestError: unknown) {
      if (isAxiosError(requestError) && [401, 403].includes(requestError.response?.status ?? 0)) {
        setIsAuthenticated(false);
      } else {
        setError(
          isAxiosError(requestError) && requestError.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : 'Unable to reach the server. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (formData: URLSearchParams) => {
    await authApi.getCsrf(); // make sure we have csrf cookie
    await authApi.login(formData);
    setIsAuthenticated(true);
    navigate('/');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch(e) {
        // ignore errors on logout
    }
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, error, login, logout, retry: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
