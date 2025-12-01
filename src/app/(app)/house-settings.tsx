import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';
import { Save, ArrowLeft, X, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { KribTheme } from '../../theme/theme';

export default function HouseSettings() {
    const router = useRouter();
    const { household, member, loading: contextLoading } = useHousehold();
    const [saving, setSaving] = useState(false);

    const isAdmin = member?.role === 'ADMIN';
    const householdId = household?.id;

    // State
    const [photoUrl, setPhotoUrl] = useState('');
    const [noResponseAction, setNoResponseAction] = useState<'EAT' | 'NO_EAT'>('NO_EAT');
    const [inviteCode, setInviteCode] = useState('');
    const [deadlineTime, setDeadlineTime] = useState('16:00:00');
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (household) {
            setPhotoUrl(household.photo_url || '');
            setNoResponseAction(household.config_no_response_action || 'NO_EAT');
            setInviteCode(household.invite_code || '');
            setDeadlineTime(household.config_deadline_time || '16:00:00');
        }
    }, [household]);

    async function handleSave() {
        if (!isAdmin) {
            Alert.alert('Geen toegang', 'Alleen beheerders kunnen instellingen aanpassen.');
            return;
        }

        // Validate time format HH:MM or HH:MM:SS
        // const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
        // if (!timeRegex.test(deadlineTime)) {
        //     Alert.alert('Ongeldig formaat', 'Gebruik HH:MM (bijv. 16:00)');
        //     return;
        // }

        setSaving(true);

        // Update Photo and Config
        if (householdId) {
            const { error } = await supabase
                .from('households')
                .update({
                    photo_url: photoUrl,
                    config_no_response_action: noResponseAction,
                    config_deadline_time: deadlineTime
                } as any)
                .eq('id', householdId);

            if (error) console.error('Error updating settings:', error);
        }

        setSaving(false);
        Alert.alert('Succes', 'Instellingen opgeslagen!');
    }

    if (contextLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Instellingen</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Uitnodigingscode</Text>
                        <Text style={styles.sectionDescription}>
                            Deel deze code met huisgenoten om ze toe te voegen.
                        </Text>
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeText}>{inviteCode}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Huis Foto</Text>
                        <Text style={styles.sectionDescription}>
                            Plak een URL van een afbeelding voor op de homepage.
                        </Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Foto URL</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, styles.textInput]}
                                    value={photoUrl}
                                    onChangeText={setPhotoUrl}
                                    placeholder="https://example.com/image.jpg"
                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                    editable={isAdmin}
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSave}
                                />
                                {photoUrl.length > 0 && isAdmin && (
                                    <TouchableOpacity onPress={() => setPhotoUrl('')} style={styles.clearButton}>
                                        <X size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Deadline Avondeten (HH:MM)</Text>
                            <View style={styles.inputWrapper}>
                                {Platform.OS === 'android' && (
                                    <TouchableOpacity
                                        style={[styles.input, styles.textInput, { justifyContent: 'center' }]}
                                        onPress={() => isAdmin && setShowTimePicker(true)}
                                    >
                                        <Text style={{ color: '#FFFFFF' }}>{deadlineTime.substring(0, 5)}</Text>
                                    </TouchableOpacity>
                                )}
                                {Platform.OS === 'ios' && (
                                    <DateTimePicker
                                        value={(() => {
                                            const [h, m] = deadlineTime.split(':');
                                            const d = new Date();
                                            d.setHours(parseInt(h), parseInt(m));
                                            return d;
                                        })()}
                                        mode="time"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) {
                                                const hours = selectedDate.getHours().toString().padStart(2, '0');
                                                const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                                                setDeadlineTime(`${hours}:${minutes}:00`);
                                            }
                                        }}
                                        style={{ alignSelf: 'flex-start' }}
                                        disabled={!isAdmin}
                                        themeVariant="light"
                                    />
                                )}
                                {showTimePicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={(() => {
                                            const [h, m] = deadlineTime.split(':');
                                            const d = new Date();
                                            d.setHours(parseInt(h), parseInt(m));
                                            return d;
                                        })()}
                                        mode="time"
                                        is24Hour={true}
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowTimePicker(false);
                                            if (selectedDate) {
                                                const hours = selectedDate.getHours().toString().padStart(2, '0');
                                                const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                                                setDeadlineTime(`${hours}:${minutes}:00`);
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color={KribTheme.colors.primary} />
                                ) : (
                                    <>
                                        <Save size={20} color={KribTheme.colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.saveButtonText}>Opslaan</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {!isAdmin && (
                            <Text style={styles.warningText}>Alleen beheerders kunnen deze instellingen wijzigen.</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Eetlijst Instellingen</Text>
                        <Text style={styles.sectionDescription}>
                            Bepaal of huisgenoten standaard mee-eten of niet.
                        </Text>

                        <View style={styles.settingRow}>
                            <TouchableOpacity
                                style={[styles.optionButton, noResponseAction === 'EAT' && styles.optionButtonActive]}
                                onPress={() => isAdmin && setNoResponseAction('EAT')}
                                disabled={!isAdmin}
                            >
                                <Text style={[styles.optionText, noResponseAction === 'EAT' && styles.optionTextActive]}>
                                    Standaard Mee-eten
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionButton, noResponseAction === 'NO_EAT' && styles.optionButtonActive]}
                                onPress={() => isAdmin && setNoResponseAction('NO_EAT')}
                                disabled={!isAdmin}
                            >
                                <Text style={[styles.optionText, noResponseAction === 'NO_EAT' && styles.optionTextActive]}>
                                    Standaard Niet Mee-eten
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helperText}>
                            {noResponseAction === 'EAT'
                                ? "Iedereen eet mee, tenzij ze zich afmelden."
                                : "Niemand eet mee, tenzij ze zich aanmelden."}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: KribTheme.colors.background,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    content: {
        padding: 16,
        gap: 16, // Add gap between sections
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16, // Reduced from 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: '#FFFFFF',
    },
    textInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingRight: 40,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
        padding: 4,
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 4,
        backgroundColor: '#FFFFFF',
        ...KribTheme.shadows.card,
    },
    saveButtonText: {
        color: KribTheme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningText: {
        color: '#EF4444',
        fontSize: 13, // Reduced from 14
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    settingRow: {
        flexDirection: 'column',
        gap: 8, // Reduced from 12
        marginBottom: 12,
    },
    optionButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        ...KribTheme.shadows.card,
    },
    optionText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    optionTextActive: {
        color: KribTheme.colors.primary,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    codeContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },
    codeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: KribTheme.colors.primary,
        letterSpacing: 6,
    },
});
