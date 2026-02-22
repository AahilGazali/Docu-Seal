import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/axios';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from user preference or localStorage
    if (user?.theme) {
      return user.theme as Theme;
    }
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync with user preference when user changes
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setThemeState(user.theme as Theme);
    }
  }, [user?.theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Update backend if user is logged in
    if (user) {
      try {
        const { data } = await api.put('/api/auth/profile', { theme: newTheme });
        if (data?.user && setUser) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    }
  }, [user, setUser]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
