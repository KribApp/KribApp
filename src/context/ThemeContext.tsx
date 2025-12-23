import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme, Theme } from '../theme/theme';
import { useColorScheme } from 'react-native';

type ThemeContextType = {
    theme: Theme;
    isDarkMode: boolean;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            if (savedTheme === 'dark') {
                setIsDarkMode(true);
            } else if (savedTheme === 'light') {
                setIsDarkMode(false);
            } else {
                // Default to Light mode if no saved setting (User preference: don't auto-switch)
                setIsDarkMode(false);
            }
        } catch (e) {
            console.error('Failed to load theme preference', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        try {
            await AsyncStorage.setItem('user_theme', newMode ? 'dark' : 'light');
        } catch (e) {
            console.error('Failed to save theme preference', e);
        }
    };

    const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
        if (mode === 'system') {
            setIsDarkMode(systemColorScheme === 'dark');
            await AsyncStorage.removeItem('user_theme');
        } else {
            setIsDarkMode(mode === 'dark');
            await AsyncStorage.setItem('user_theme', mode);
        }
    };

    const theme = isDarkMode ? DarkTheme : LightTheme;

    if (!isLoaded) {
        return null; // Or a splash screen
    }

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
