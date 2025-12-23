import { Drawer } from 'expo-router/drawer';
import { useTheme } from '../../context/ThemeContext';
import CustomDrawerContent from '../../components/CustomDrawerContent';

export default function AppLayout() {
    const { theme } = useTheme();

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
