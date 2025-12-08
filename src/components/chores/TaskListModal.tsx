import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Plus, Trash2 } from 'lucide-react-native';

interface TaskListModalProps {
    visible: boolean;
    onClose: () => void;
    templates: any[];
    canManage: boolean;
    onAddTemplate: (title: string) => void;
    onDeleteTemplate: (id: string) => void;
}

export function TaskListModal({ visible, onClose, templates, canManage, onAddTemplate, onDeleteTemplate }: TaskListModalProps) {
    const [newTemplateTitle, setNewTemplateTitle] = useState('');

    const handleAdd = () => {
        if (newTemplateTitle.trim()) {
            onAddTemplate(newTemplateTitle.trim());
            setNewTemplateTitle('');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Takenlijst</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {canManage && (
                    <View style={styles.addChoreForm}>
                        <Text style={styles.formLabel}>Nieuwe taak toevoegen</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="Bijv. Badkamer schoonmaken"
                                value={newTemplateTitle}
                                onChangeText={setNewTemplateTitle}
                                returnKeyType="done"
                            />
                            <TouchableOpacity style={styles.addButtonSmall} onPress={handleAdd}>
                                <Plus size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <FlatList
                    data={templates}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.modalChoreItem}>
                            <Text style={styles.modalChoreTitle}>{item.title}</Text>
                            {canManage && (
                                <TouchableOpacity onPress={() => onDeleteTemplate(item.id)}>
                                    <Trash2 size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    contentContainerStyle={styles.modalListContent}
                    ListEmptyComponent={<Text style={styles.emptyListText}>Geen sjablonen gevonden.</Text>}
                />
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#312e81', // Indigo 900
        textAlign: 'center',
        flex: 1, // Ensure it takes space to center
    },
    addChoreForm: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
    },
    addButtonSmall: {
        backgroundColor: '#2563EB',
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalListContent: {
        padding: 16,
    },
    modalChoreItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    modalChoreTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyListText: {
        textAlign: 'center',
        color: '#6B7280',
        fontStyle: 'italic',
    },
});
