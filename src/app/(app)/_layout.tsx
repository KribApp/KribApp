import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import CustomDrawerContent from '../../components/CustomDrawerContent';

/**
 * App Layout (authenticated screens)
 * 
 * On web: Redirect to landing page (app is only available in native app)
 * On native: Show app screens normally
 */
export default function AppLayout() {
    const { theme } = useTheme();

    useEffect(() => {
        // Block web users from accessing app screens
        // They should download the native app instead
        if (Platform.OS === 'web') {
            router.replace('/');
        }
    }, []);

    // On web, redirect to landing page
    if (Platform.OS === 'web') {
        return null;
    }

    // On native, show app screens
    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerStyle: { backgroundColor: theme.colors.background, width: 280 },
            }}
        >
            <Drawer.Screen name="dashboard" />
            <Drawer.Screen name="chat" />
            <Drawer.Screen name="groceries" />
            <Drawer.Screen name="agenda" />
            <Drawer.Screen name="chores" />
            <Drawer.Screen name="finances" />
            <Drawer.Screen name="turf" />
            <Drawer.Screen name="house-info" />
        </Drawer>
    );
}
