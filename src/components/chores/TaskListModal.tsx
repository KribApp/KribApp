import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Plus, Trash2 } from 'lucide-react-native';

import { useTheme } from '../../context/ThemeContext';

interface TaskListModalProps {
    visible: boolean;
    onClose: () => void;
    templates: any[];
    canManage: boolean;
    onAddTemplate: (title: string) => void;
    onDeleteTemplate: (id: string) => void;
}

export function TaskListModal({ visible, onClose, templates, canManage, onAddTemplate, onDeleteTemplate }: TaskListModalProps) {
    const { theme } = useTheme();
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
                style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.modalHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Takenlijst</Text>
                    <TouchableOpacity onPress={onClose} style={{ padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }}>
                        <X size={24} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                </View>

                {canManage && (
                    <View style={[styles.addChoreForm, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.formLabel, { color: theme.colors.onBackground }]}>Nieuwe taak toevoegen</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                                placeholder="Bijv. Badkamer schoonmaken"
                                placeholderTextColor={theme.colors.text.secondary}
                                value={newTemplateTitle}
                                onChangeText={setNewTemplateTitle}
                                returnKeyType="done"
                            />
                            <TouchableOpacity style={[styles.addButtonSmall, { backgroundColor: theme.colors.surface }]} onPress={handleAdd}>
                                <Plus size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <FlatList
                    data={templates}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={[styles.modalChoreItem, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.modalChoreTitle, { color: theme.colors.text.primary }]}>{item.title}</Text>
                            {canManage && (
                                <TouchableOpacity onPress={() => onDeleteTemplate(item.id)}>
                                    <Trash2 size={20} color={theme.colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    contentContainerStyle={styles.modalListContent}
                    ListEmptyComponent={<Text style={[styles.emptyListText, { color: 'rgba(255,255,255,0.7)' }]}>Geen sjablonen gevonden.</Text>}
                />
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1, // Ensure it takes space to center
    },
    addChoreForm: {
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
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    addButtonSmall: {
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
        fontStyle: 'italic',
    },
});
