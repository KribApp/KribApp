import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { ShoppingCart, Calendar, CheckSquare, DollarSign, Home, Settings, LogOut, User, MessageSquare } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { KribTheme } from '../theme/theme';
import { useHousehold } from '../context/HouseholdContext';
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomDrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useHousehold();
    const { theme } = useTheme();
    const userEmail = user?.email || '';

    const menuItems = [
        { label: 'Homepage', icon: Home, route: '/(app)/dashboard' },
        { label: 'Chat', icon: MessageSquare, route: '/(app)/chat' },
        { label: 'Boodschappen', icon: ShoppingCart, route: '/(app)/groceries' },
        { label: 'Agenda', icon: Calendar, route: '/(app)/agenda' },
        { label: 'Huishouden', icon: CheckSquare, route: '/(app)/chores' },
        { label: 'Financiën', icon: DollarSign, route: '/(app)/finances' },
        { label: 'Turflijstjes', icon: CheckSquare, route: '/(app)/turf' },
        { label: 'Huis Info', icon: Home, route: '/(app)/house-info' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Profile Header */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={[styles.settingsButton, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/user-settings');
                            }}
                        >
                            <Settings size={20} color={theme.colors.text.primary} />
                        </TouchableOpacity>

                        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                            {user?.profile_picture_url ? (
                                <Image
                                    source={{ uri: user.profile_picture_url }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <User size={32} color={theme.colors.primary} />
                            )}
                        </View>

                        <View style={{ width: 40 }} />
                    </View>

                    <Text style={[styles.username, { color: theme.colors.onBackground }]} numberOfLines={1}>
                        {user?.username || userEmail.split('@')[0]}
                    </Text>
                </View>

                {/* Navigation Items */}
                <View style={styles.itemsContainer}>
                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.route;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.item,
                                    { backgroundColor: isActive ? theme.colors.primary : 'transparent' }
                                ]}
                                onPress={() => {
                                    props.navigation.closeDrawer();
                                    router.push(item.route as any);
                                }}
                            >
                                <item.icon
                                    size={24}
                                    color={isActive ? '#FFFFFF' : theme.colors.onBackground}
                                />
                                <Text style={[
                                    styles.itemLabel,
                                    { color: isActive ? '#FFFFFF' : theme.colors.onBackground },
                                    isActive && { fontWeight: 'bold' }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </DrawerContentScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        marginBottom: 8,
        alignItems: 'center', // Center content horizontally
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarContainer: {
        width: 80, // Increased size
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    username: {
        fontSize: 22, // Slightly larger
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        display: 'none', // Ensure it's hidden if somehow rendered
    },
    itemsContainer: {
        paddingHorizontal: 8, // Reduced padding to make buttons wider
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16, // Increased padding for larger touch target
        borderRadius: 12,
        marginBottom: 6, // Slightly more spacing
    },
    itemLabel: {
        marginLeft: 16,
        fontSize: 17, // Slightly larger font
        fontWeight: '500',
    },
});
