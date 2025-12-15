import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image } from 'react-native';
import { X, ChevronRight, User as UserIcon, Plus } from 'lucide-react-native';
import { KribTheme } from '../../theme/theme';

interface AssignmentModalProps {
    visible: boolean;
    onClose: () => void;
    templates: any[];
    members: any[];
    selectedTemplate: any | null;
    onSelectTemplate: (template: any) => void;
    onAssign: (memberId: string) => void;
}

export function AssignmentModal({ visible, onClose, templates, members, selectedTemplate, onSelectTemplate, onAssign }: AssignmentModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.centeredModalOverlay}>
                <View style={styles.centeredModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {selectedTemplate ? 'Kies Persoon' : 'Kies Taak'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={KribTheme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {!selectedTemplate ? (
                        <FlatList
                            data={templates}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.selectionItem}
                                    onPress={() => onSelectTemplate(item)}
                                >
                                    <View style={styles.templateInfo}>
                                        <Text style={styles.selectionItemText}>{item.title}</Text>
                                        {item.points && <Text style={styles.points}>{item.points} pnt</Text>}
                                    </View>
                                    <ChevronRight size={20} color={KribTheme.colors.text.secondary} />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Geen taken beschikbaar. Voeg eerst sjablonen toe.</Text>}
                            contentContainerStyle={styles.listContent}
                        />
                    ) : (
                        <FlatList
                            data={members}
                            keyExtractor={item => item.user_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.selectionItem}
                                    onPress={() => onAssign(item.user_id)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {item.users.profile_picture_url ? (
                                            <Image
                                                source={{ uri: item.users.profile_picture_url }}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                                <Text style={styles.avatarText}>
                                                    {item.users.username?.substring(0, 1).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.selectionItemText}>{item.users.username}</Text>
                                    </View>
                                    <Plus size={20} color={KribTheme.colors.primary} />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    centeredModalContent: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.xl,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
        ...KribTheme.shadows.floating,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    selectionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.background,
        backgroundColor: KribTheme.colors.surface,
    },
    selectionItemText: {
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        fontWeight: '500',
    },
    templateInfo: {
        gap: 4,
    },
    points: {
        fontSize: 12,
        color: KribTheme.colors.warning,
        fontWeight: '600',
    },
    emptyListText: {
        padding: 20,
        textAlign: 'center',
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
    listContent: {
        paddingVertical: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarPlaceholder: {
        backgroundColor: KribTheme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
    },
});
