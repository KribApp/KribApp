import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import { KribTheme } from '../../theme/theme';
import { useWindowDimensions } from 'react-native';

export default function AppLayout() {
    const dimensions = useWindowDimensions();

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: dimensions.width >= 768 ? 'permanent' : 'front',
                drawerStyle: {
                    width: 300,
                    backgroundColor: KribTheme.colors.surface,
                },
                drawerActiveTintColor: KribTheme.colors.primary,
                drawerInactiveTintColor: KribTheme.colors.text.secondary,
                drawerLabelStyle: {
                    fontWeight: '600',
                    fontSize: 16,
                },
            }}
        >
            <Drawer.Screen name="dashboard" options={{ title: 'Homepage' }} />
            <Drawer.Screen name="chat" options={{ title: 'Chat' }} />
            <Drawer.Screen name="groceries" options={{ title: 'Boodschappen' }} />
            <Drawer.Screen name="agenda" options={{ title: 'Agenda' }} />
            <Drawer.Screen name="chores" options={{ title: 'Huishouden' }} />
            <Drawer.Screen name="finances" options={{ title: 'Financiën' }} />
            <Drawer.Screen name="turf" options={{ title: 'Turflijstjes' }} />
            <Drawer.Screen name="house-info" options={{ title: 'Huis Info' }} />
        </Drawer>
    );
}
