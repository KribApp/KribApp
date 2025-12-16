import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Bell, CheckCircle } from 'lucide-react-native';
import { KribTheme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { Notification } from '../../types/models';

interface AlertsListProps {
    alerts: Notification[];
    loading: boolean;
    onResolve: (id: string, relatedEntityId?: string | null) => void;
}

export function AlertsList({ alerts, loading, onResolve }: AlertsListProps) {
    const { theme } = useTheme();

    function getDateLabel(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return 'Vandaag';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Gisteren';
        } else {
            return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
        }
    }

    const renderAlert = ({ item, index }: { item: Notification, index: number }) => {
        const isResolved = item.is_resolved;

        const showDateDivider = (() => {
            if (index === 0) return true;
            const prevAlert = alerts[index - 1];
            const prevDate = new Date(prevAlert.created_at).toDateString();
            const currDate = new Date(item.created_at).toDateString();
            return prevDate !== currDate;
        })();

        const handleLongPress = () => {
            if (isResolved) return;
            Alert.alert(
                "Melding afhandelen",
                "Wil je deze melding afvinken?",
                [
                    { text: "Annuleren", style: "cancel" },
                    {
                        text: "Afvinken",
                        onPress: () => onResolve(item.id, item.related_entity_id),
                        style: "default"
                    }
                ]
            );
        };

        return (
            <View>
                {showDateDivider && (
                    <View style={styles.dateDivider}>
                        <Text style={[styles.dateDividerText, { color: theme.colors.text.secondary }]}>{getDateLabel(item.created_at)}</Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[
                        styles.alertCard,
                        { backgroundColor: theme.colors.inputBackground, borderLeftColor: theme.colors.secondary },
                        isResolved && [styles.alertCardResolved, { backgroundColor: theme.colors.background, borderLeftColor: theme.colors.success }]
                    ]}
                    onLongPress={handleLongPress}
                    delayLongPress={500} // "Short amount of time, a bit longer than instantly"
                    activeOpacity={0.7}
                    disabled={isResolved}
                >
                    <View style={styles.alertIconContainer}>
                        {isResolved ? (
                            <CheckCircle size={20} color={theme.colors.success} />
                        ) : (
                            <Bell size={20} color={theme.colors.secondary} />
                        )}
                    </View>
                    <View style={styles.alertContent}>
                        <Text style={[
                            styles.alertText,
                            { color: theme.colors.text.primary },
                            isResolved && [styles.alertTextResolved, { color: theme.colors.text.secondary }]
                        ]}>
                            {item.message || item.content}
                        </Text>
                        <Text style={[styles.alertTime, { color: theme.colors.text.secondary }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </TouchableOpacity >
            </View >
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Recente Meldingen</Text>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={alerts}
                    renderItem={renderAlert}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <Text style={[styles.emptyListText, { color: theme.colors.text.secondary }]}>Geen recente meldingen.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // White Card
        borderRadius: 16,
        padding: 16,
        ...KribTheme.shadows.card,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        marginBottom: 12,
    },
    listContent: {
        paddingBottom: 20,
    },
    alertCard: {
        backgroundColor: '#F9FAFB', // Light Grey for items inside white card
        borderRadius: KribTheme.borderRadius.m,
        padding: KribTheme.spacing.m,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: KribTheme.spacing.s,
        borderLeftWidth: 4,
        borderLeftColor: KribTheme.colors.secondary,
        // Removed shadow from inner items to reduce clutter
    },
    alertCardResolved: {
        backgroundColor: '#F3F4F6', // Slightly darker grey for resolved
        borderLeftColor: KribTheme.colors.success,
        opacity: 0.6,
    },
    alertIconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    alertContent: {
        flex: 1,
    },
    alertText: {
        fontSize: 14,
        color: KribTheme.colors.text.primary,
        marginBottom: 4,
    },
    alertTextResolved: {
        textDecorationLine: 'line-through',
        color: KribTheme.colors.text.secondary,
    },
    alertTime: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 20,
    },
    emptyListText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
    dateDivider: {
        marginTop: 16,
        marginBottom: 8,
    },
    dateDividerText: {
        fontSize: 14,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
    },
});
