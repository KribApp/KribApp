import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { ShoppingCart, Calendar, CheckSquare, DollarSign, Home, Settings, LogOut, User, MessageSquare } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { KribTheme } from '../theme/theme';
import { useHousehold } from '../context/HouseholdContext';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomDrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useHousehold();
    const userEmail = user?.email || '';

    const menuItems = [
        { label: 'Homepage', icon: Home, route: '/(app)/dashboard' },
        { label: 'Chat', icon: MessageSquare, route: '/(app)/chat' },
        { label: 'Boodschappen', icon: ShoppingCart, route: '/(app)/groceries' },
        { label: 'Agenda', icon: Calendar, route: '/agenda' },
        { label: 'Huishouden', icon: CheckSquare, route: '/chores' },
        { label: 'Financiën', icon: DollarSign, route: '/finances' },
        { label: 'Turflijstjes', icon: CheckSquare, route: '/(app)/turf' },
        { label: 'Huis Info', icon: Home, route: '/(app)/house-info' },
    ];

    return (
        <View style={styles.container}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(app)/user-settings');
                            }}
                        >
                            <Settings size={20} color={KribTheme.colors.primary} />
                        </TouchableOpacity>
                        <View style={styles.avatarContainer}>
                            <User size={32} color={KribTheme.colors.primary} />
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <Text style={styles.username} numberOfLines={1}>{userEmail.split('@')[0]}</Text>
                    <Text style={styles.email} numberOfLines={1}>{userEmail}</Text>
                </View>

                {/* Navigation Items */}
                <View style={styles.itemsContainer}>
                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.route;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.item, isActive && styles.itemActive]}
                                onPress={() => {
                                    props.navigation.closeDrawer();
                                    router.push(item.route as any);
                                }}
                            >
                                <item.icon
                                    size={24}
                                    color={isActive ? KribTheme.colors.primary : KribTheme.colors.text.primary}
                                />
                                <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
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
        backgroundColor: KribTheme.colors.primary, // Full Indigo Background
    },
    header: {
        padding: 24,
        paddingTop: 60,
        marginBottom: 16,
        alignItems: 'center',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 12,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },
    username: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    itemsContainer: {
        paddingHorizontal: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        marginBottom: 12,
        backgroundColor: '#FFFFFF', // White buttons
        ...KribTheme.shadows.card,
    },
    itemActive: {
        borderWidth: 2,
        borderColor: '#FFFFFF', // Optional: Highlight active item
        backgroundColor: '#F0F0FF', // Slightly different white/blue for active
    },
    itemLabel: {
        marginLeft: 16,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        fontWeight: '600',
    },
    itemLabelActive: {
        color: KribTheme.colors.primary,
        fontWeight: 'bold',
    },
});
