import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { ShoppingCart, CheckSquare, Plus, Calculator, MessageCircle, Calendar, DollarSign } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export function QuickActions({ onAction }: { onAction?: (action: string) => void }) {
    const router = useRouter();
    const { theme } = useTheme();

    const actions = [
        {
            id: 'chat',
            label: 'Chat',
            icon: <MessageCircle size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/chat')
        },
        {
            id: 'groceries',
            label: 'Boodschappen',
            icon: <ShoppingCart size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/groceries')
        },
        {
            id: 'agenda',
            label: 'Agenda',
            icon: <Calendar size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/agenda')
        },
        {
            id: 'chore',
            label: 'Huishouden',
            icon: <CheckSquare size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/chores')
        },
        {
            id: 'expense',
            label: 'Financiën',
            icon: <DollarSign size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/finances')
        },
        {
            id: 'turf',
            label: 'Turven',
            icon: <Calculator size={24} color={theme.colors.primary} />,
            onPress: () => router.push('/(app)/turf')
        }
    ];

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Shortcuts</Text>
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
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                            {action.icon}
                        </View>
                        <Text style={[styles.actionLabel, { color: theme.colors.onBackground, opacity: 0.9 }]}>{action.label}</Text>
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
        // backgroundColor: dynamic
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // shadows dynamic
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
});
