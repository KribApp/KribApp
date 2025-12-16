import React from 'react';
import { View, Text, StyleSheet, Image, FlatList } from 'react-native';
import { KribTheme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { ActivityLogWithUser } from '../../types/models';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ActivityFeedProps {
    activities: ActivityLogWithUser[];
    loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
    const { theme } = useTheme();

    if (!loading && activities.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: theme.colors.onBackground }]}>Recente Activiteit</Text>
                <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Nog geen recente activiteit.</Text>
                </View>
            </View>
        );
    }

    const renderItem = ({ item }: { item: ActivityLogWithUser }) => {
        return (
            <View style={[styles.itemContainer, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.avatarContainer}>
                    {item.users?.profile_picture_url ? (
                        <Image
                            source={{ uri: item.users.profile_picture_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                            <Text style={[styles.avatarText, { color: theme.colors.text.inverse }]}>
                                {item.users?.username?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.contentContainer}>
                    <Text style={[styles.message, { color: theme.colors.text.primary }]}>
                        <Text style={styles.username}>{item.users?.username || 'Systeem'}</Text>{' '}
                        {item.content}
                    </Text>
                    <Text style={[styles.time, { color: theme.colors.text.secondary }]}>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: nl })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Recente Activiteit</Text>
            <FlatList
                data={activities}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={[styles.listContent, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        marginLeft: 16,
    },
    emptyState: {
        padding: 24,
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.l,
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },
    emptyText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
    listContent: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.l,
        padding: 8,
        ...KribTheme.shadows.card,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.background,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        fontSize: 14,
        color: KribTheme.colors.text.primary,
        lineHeight: 20,
    },
    username: {
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
        marginTop: 2,
    },
});
