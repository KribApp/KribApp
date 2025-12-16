// Theme Type Definition
export type Theme = {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        card: string;
        text: {
            primary: string;
            secondary: string;
            inverse: string;
            accent: string;
        };
        success: string;
        warning: string;
        error: string;
        border: string;
        divider: string;
        inputBackground: string;
        onBackground: string;
    };
    spacing: {
        xs: number;
        s: number;
        m: number;
        l: number;
        xl: number;
    };
    borderRadius: {
        s: number;
        m: number;
        l: number;
        xl: number;
    };
    shadows: {
        card: any;
        floating: any;
    };
    dark: boolean;
};

// Base values shared between themes
const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};

const borderRadius = {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
};

export const LightTheme: Theme = {
    dark: false,
    colors: {
        primary: '#5D5FEF', // Krib Kinetic Indigo
        secondary: '#FF6B6B', // Solar Coral
        background: '#5D5FEF', // Indigo Background (Global)
        surface: '#FFFFFF', // Card Background
        card: '#FFFFFF', // Alias for surface
        text: {
            primary: '#111827',
            secondary: '#6B7280',
            inverse: '#FFFFFF',
            accent: '#5D5FEF',
        },
        success: '#10B981', // Signal Teal
        warning: '#F59E0B', // Amber
        error: '#EF4444', // Radical Red
        border: '#E5E7EB',
        divider: '#F3F4F6',
        inputBackground: '#F9FAFB',
        onBackground: '#FFFFFF',
    },
    spacing,
    borderRadius,
    shadows: {
        card: {
            shadowColor: '#5D5FEF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
        },
        floating: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
        }
    }
};

export const DarkTheme: Theme = {
    dark: true,
    colors: {
        primary: '#6366F1', // Slightly lighter Indigo for dark mode
        secondary: '#FF8A8A', // Brighter Coral
        background: '#111827', // Dark Gray/Black Background
        surface: '#1F2937', // Darker Gray Card Background
        card: '#1F2937',
        text: {
            primary: '#F9FAFB', // Near White
            secondary: '#9CA3AF', // Lighter Gray
            inverse: '#111827', // Dark Text (for light buttons)
            accent: '#818CF8',
        },
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        border: '#374151',
        divider: '#374151',
        inputBackground: '#374151',
        onBackground: '#F9FAFB',
    },
    spacing,
    borderRadius,
    shadows: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        floating: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
        }
    }
};

// Backwards compatibility alias
export const KribTheme = LightTheme;
