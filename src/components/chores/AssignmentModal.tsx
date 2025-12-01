import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { X, ChevronRight, User as UserIcon, Plus } from 'lucide-react-native';

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
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#374151" />
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
                                    <Text style={styles.selectionItemText}>{item.title}</Text>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Geen taken beschikbaar. Voeg eerst sjablonen toe.</Text>}
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <UserIcon size={20} color="#6B7280" style={{ marginRight: 12 }} />
                                        <Text style={styles.selectionItemText}>{item.users.username}</Text>
                                    </View>
                                    <Plus size={20} color="#2563EB" />
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    selectionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectionItemText: {
        fontSize: 16,
        color: '#111827',
    },
    emptyListText: {
        padding: 16,
        textAlign: 'center',
        color: '#6B7280',
        fontStyle: 'italic',
    },
});
