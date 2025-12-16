import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Utensils } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { KribTheme } from '../../theme/theme';

interface DiningStatusCardProps {
    eatingCount: number | null;
}

export function DiningStatusCard({ eatingCount }: DiningStatusCardProps) {
    const navigation = useNavigation();
    const { theme } = useTheme();

    return (
        <TouchableOpacity style={[styles.statusCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.floating.shadowColor }]} onPress={() => navigation.navigate('agenda' as never)}>
            <View style={[styles.statusIconContainer, { backgroundColor: theme.colors.primary }]}>
                <Utensils size={24} color="#FFFFFF" />
            </View>
            <View>
                <Text style={[styles.statusTitle, { color: theme.colors.text.secondary }]}>Eten vanavond</Text>
                <Text style={[styles.statusValue, { color: theme.colors.text.primary }]}>
                    {eatingCount !== null ? `${eatingCount} eters` : 'Laden...'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    statusCard: {
        borderRadius: KribTheme.borderRadius.xl,
        padding: KribTheme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: KribTheme.spacing.l,
        ...KribTheme.shadows.floating,
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
