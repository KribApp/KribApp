import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image } from 'react-native';
import { X, ChevronRight, User as UserIcon, Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

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
    const { theme } = useTheme();
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.centeredModalOverlay}>
                <View style={[styles.centeredModalContent, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.floating.shadowColor }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                            {selectedTemplate ? 'Kies Persoon' : 'Kies Taak'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {!selectedTemplate ? (
                        <FlatList
                            data={templates}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.selectionItem, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                                    onPress={() => onSelectTemplate(item)}
                                >
                                    <View style={styles.templateInfo}>
                                        <Text style={[styles.selectionItemText, { color: theme.colors.text.primary }]}>{item.title}</Text>
                                    </View>
                                    <ChevronRight size={20} color={theme.colors.text.secondary} />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
                            ListEmptyComponent={<Text style={[styles.emptyListText, { color: theme.colors.text.secondary }]}>Geen taken beschikbaar. Voeg eerst sjablonen toe.</Text>}
                            contentContainerStyle={styles.listContent}
                        />
                    ) : (
                        <FlatList
                            data={members}
                            keyExtractor={item => item.user_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.selectionItem, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                                    onPress={() => onAssign(item.user_id)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {item.users.profile_picture_url ? (
                                            <Image
                                                source={{ uri: item.users.profile_picture_url }}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.border }]}>
                                                <Text style={[styles.avatarText, { color: theme.colors.text.secondary }]}>
                                                    {item.users.username?.substring(0, 1).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.selectionItemText, { color: theme.colors.text.primary }]}>{item.users.username}</Text>
                                    </View>
                                    <Plus size={20} color={theme.colors.primary} />
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
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
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
    },
    selectionItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    templateInfo: {
        gap: 4,
    },
    points: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyListText: {
        padding: 20,
        textAlign: 'center',
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
