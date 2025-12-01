export const KribTheme = {
    colors: {
        primary: '#5D5FEF', // Krib Kinetic Indigo
        secondary: '#FF6B6B', // Solar Coral
        background: '#5D5FEF', // Indigo Background (Global)
        surface: '#FFFFFF', // Card Background
        text: {
            primary: '#111827',
            secondary: '#6B7280',
            inverse: '#FFFFFF',
        },
        success: '#10B981', // Signal Teal
        warning: '#F59E0B', // Amber
        error: '#EF4444', // Radical Red
        border: '#E5E7EB',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 8,
        m: 12,
        l: 16,
        xl: 24, // Super-ellipse feel
    },
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
