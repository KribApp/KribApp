import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Utensils } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { KribTheme } from '../../theme/theme';

interface DiningStatusCardProps {
    eatingCount: number | null;
}

export function DiningStatusCard({ eatingCount }: DiningStatusCardProps) {
    const navigation = useNavigation();

    return (
        <TouchableOpacity style={styles.statusCard} onPress={() => navigation.navigate('agenda' as never)}>
            <View style={styles.statusIconContainer}>
                <Utensils size={24} color="#FFFFFF" />
            </View>
            <View>
                <Text style={styles.statusTitle}>Eten vanavond</Text>
                <Text style={styles.statusValue}>
                    {eatingCount !== null ? `${eatingCount} eters` : 'Laden...'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    statusCard: {
        backgroundColor: KribTheme.colors.surface,
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
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusTitle: {
        fontSize: 14,
        color: KribTheme.colors.text.secondary,
        fontWeight: '600',
    },
    statusValue: {
        fontSize: 18,
        color: KribTheme.colors.text.primary,
        fontWeight: 'bold',
    },
});
