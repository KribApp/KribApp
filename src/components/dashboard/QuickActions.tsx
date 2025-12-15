import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { KribTheme } from '../../theme/theme';
import { ShoppingCart, CheckSquare, Plus, Calculator, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function QuickActions({ onAction }: { onAction?: (action: string) => void }) {
    const router = useRouter();

    const actions = [
        {
            id: 'groceries',
            label: 'Boodschap',
            icon: <ShoppingCart size={24} color={KribTheme.colors.primary} />,
            onPress: () => router.push('/(app)/groceries')
        },
        {
            id: 'chore',
            label: 'Taak',
            icon: <CheckSquare size={24} color={KribTheme.colors.primary} />,
            onPress: () => router.push('/(app)/chores')
        },
        {
            id: 'expense',
            label: 'Uitgave',
            icon: <Plus size={24} color={KribTheme.colors.primary} />,
            onPress: () => router.push('/(app)/finances')
        },
        {
            id: 'turf',
            label: 'Turven', // Or Turflijstjes
            icon: <Calculator size={24} color={KribTheme.colors.primary} />,
            onPress: () => router.push('/(app)/turf')
        },
        {
            id: 'chat',
            label: 'Chat',
            icon: <MessageCircle size={24} color={KribTheme.colors.primary} />,
            onPress: () => router.push('/(app)/chat')
        }
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Snelle Acties</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {actions.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={styles.actionButton}
                        onPress={action.onPress}
                    >
                        <View style={styles.iconContainer}>
                            {action.icon}
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        marginTop: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        marginLeft: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    actionButton: {
        alignItems: 'center',
        width: 72,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: KribTheme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        ...KribTheme.shadows.card,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#FFFFFF',
        textAlign: 'center',
    },
});
