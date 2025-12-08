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
    const [name, setName] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const [timezone, setTimezone] = useState('Europe/Amsterdam');
    const [noResponseAction, setNoResponseAction] = useState<'EAT' | 'NO_EAT'>('NO_EAT');
    const [inviteCode, setInviteCode] = useState('');
    const [deadlineTime, setDeadlineTime] = useState('16:00:00');
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (household) {
            setPhotoUrl(household.photo_url || '');
            setName(household.name || '');
            setStreet(household.street || '');
            setHouseNumber(household.house_number || '');
            setPostalCode(household.postal_code || '');
            setCity(household.city || '');
            setProvince(household.province || '');
            setCountry(household.country || '');
            setTimezone(household.timezone || 'Europe/Amsterdam');
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
                    name,
                    street,
                    house_number: houseNumber,
                    postal_code: postalCode,
                    city,
                    province,
                    country,
                    timezone,
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

    async function handleLeaveHousehold() {
        if (!member || !householdId) return;

        if (isAdmin) {
            const { count, error } = await supabase
                .from('household_members')
                .select('*', { count: 'exact', head: true })
                .eq('household_id', householdId)
                .eq('role', 'ADMIN');

            if (count === 1) {
                Alert.alert(
                    'Kan niet verlaten',
                    'Je bent de enige beheerder van dit huis. Promoveer eerst een ander lid tot beheerder voordat je het huis verlaat.'
                );
                return;
            }
        }

        Alert.alert(
            'Huis verlaten',
            'Weet je zeker dat je dit huis wilt verlaten? Je kunt alleen terugkeren met een nieuwe uitnodiging.',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Verlaten',
                    style: 'destructive',
                    onPress: async () => {
                        setSaving(true);
                        const { error } = await supabase
                            .from('household_members')
                            .delete()
                            .eq('household_id', householdId)
                            .eq('user_id', member.user_id);

                        if (error) {
                            Alert.alert('Fout', 'Kon huis niet verlaten.');
                            setSaving(false);
                        } else {
                            // Force refresh or just navigate
                            router.replace('/(auth)/household-start');
                        }
                    }
                }
            ]
        );
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
                    <ArrowLeft size={24} color="#5D5FEF" />
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
                        <Text style={styles.sectionTitle}>Algemeen</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Naam Huishouden</Text>
                            <TextInput
                                style={styles.textInput}
                                value={name}
                                onChangeText={setName}
                                placeholder="Naam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={isAdmin}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Straat</Text>
                            <TextInput
                                style={styles.textInput}
                                value={street}
                                onChangeText={setStreet}
                                placeholder="Straatnaam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={isAdmin}
                            />
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Huisnummer</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={houseNumber}
                                    onChangeText={setHouseNumber}
                                    placeholder="Nr"
                                    placeholderTextColor={KribTheme.colors.text.secondary}
                                    editable={isAdmin}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                                <Text style={styles.label}>Postcode</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                    placeholder="1234 AB"
                                    placeholderTextColor={KribTheme.colors.text.secondary}
                                    editable={isAdmin}
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Stad</Text>
                            <TextInput
                                style={styles.textInput}
                                value={city}
                                onChangeText={setCity}
                                placeholder="Stad"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={isAdmin}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tijdzone</Text>
                            <TextInput
                                style={styles.textInput}
                                value={timezone}
                                onChangeText={setTimezone}
                                placeholder="Europe/Amsterdam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={isAdmin}
                            />
                        </View>
                    </View>

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
                                        <Text style={{ color: '#111827' }}>{deadlineTime.substring(0, 5)}</Text>
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
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Save size={20} color="#FFFFFF" />
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

                    <TouchableOpacity
                        style={[styles.leaveButton, { marginTop: 24 }]}
                        onPress={handleLeaveHousehold}
                        disabled={saving}
                    >
                        <Text style={styles.leaveButtonText}>Verlaat Huis</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5D5FEF',
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
        color: '#5D5FEF',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16, // Reduced from 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5D5FEF',
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
        color: '#111827',
    },
    textInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#5D5FEF',
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
        backgroundColor: '#5D5FEF',
        ...KribTheme.shadows.card,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
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
        borderColor: '#5D5FEF',
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: '#5D5FEF',
        borderColor: '#5D5FEF',
        ...KribTheme.shadows.card,
    },
    optionText: {
        fontSize: 16,
        color: '#5D5FEF',
        fontWeight: '500',
    },
    optionTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 14,
        color: '#6B7280',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    codeContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#5D5FEF',
        ...KribTheme.shadows.card,
    },
    codeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#5D5FEF',
        letterSpacing: 6,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        borderWidth: 1,
        borderColor: KribTheme.colors.error,
        marginBottom: 40,
    },
    leaveButtonText: {
        color: KribTheme.colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
    },
});
