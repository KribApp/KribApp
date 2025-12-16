import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { KribTheme } from '../../theme/theme';

export function NoHouseholdState() {
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <View style={styles.emptyState}>
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>Geen huis gevonden</Text>
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Je bent nog geen lid van een huis.</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}
                    onPress={() => router.push('/(auth)/create-household')}
                >
                    <Text style={[styles.createButtonText, { color: theme.colors.primary }]}>Huis Aanmaken</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        ...KribTheme.shadows.card,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: KribTheme.colors.text.secondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    createButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        ...KribTheme.shadows.card,
    },
    createButtonText: {
        color: KribTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});
