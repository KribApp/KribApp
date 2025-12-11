import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';
import { Save, ArrowLeft, X, Clock, Camera, Link as LinkIcon, Image as ImageIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { KribTheme } from '../../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { Strings } from '../../constants/strings';

export default function HouseSettings() {
    const router = useRouter();
    const { household, member, loading: contextLoading, refreshHousehold } = useHousehold();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const isAdmin = member?.role === 'ADMIN';
    const householdId = household?.id;

    // State
    const [photoUrl, setPhotoUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
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
            // If it matches a storage URL, assume upload mode (hide link input initially)
            // But if it's a raw generic URL, maybe show link input?
            // For simplicity, always hide link input initially unless empty
            setShowLinkInput(!household.photo_url);
        }
    }, [household]);

    const uploadImage = async (uri: string) => {
        try {
            setUploading(true);

            // Usage of fetch().blob() is unreliable in React Native with some engines.
            // Using FileSystem + base64 is robust.
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });
            const arrayBuffer = decode(base64);

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${householdId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('households')
                .upload(filePath, arrayBuffer, {
                    contentType: `image/${fileExt}`,
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('households').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert(Strings.common.error, Strings.household.uploadError);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images, // Fixed deprecated property
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uploadedUrl = await uploadImage(result.assets[0].uri);
            if (uploadedUrl) {
                setPhotoUrl(uploadedUrl);
                setShowLinkInput(false);
            }
        }
    };

    const handleChangePhoto = () => {
        if (!isAdmin) return;

        Alert.alert(Strings.household.changePhoto, undefined, [
            {
                text: Strings.household.uploadPhoto,
                onPress: handlePickImage,
                style: 'default',
            },
            {
                text: Strings.household.enterUrl,
                onPress: () => setShowLinkInput(true),
                style: 'default',
            },
            {
                text: Strings.common.cancel,
                style: 'cancel',
            },
        ]);
    };

    async function handleSave() {
        if (!isAdmin) {
            Alert.alert('Geen toegang', 'Alleen beheerders kunnen instellingen aanpassen.');
            return;
        }

        setSaving(true);

        if (householdId) {
            const { error } = await supabase
                .from('households')
                .update({
                    name,
                    photo_url: photoUrl,
                    config_no_response_action: noResponseAction,
                    config_deadline_time: deadlineTime
                } as any)
                .eq('id', householdId);

            if (error) {
                console.error('Error updating settings:', error);
            } else {
                await refreshHousehold();
            }
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

                        {/* Address fields - Read only, set during creation */}
                        <Text style={styles.addressNote}>Adres (niet te wijzigen na aanmaken)</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Straat</Text>
                            <TextInput
                                style={[styles.textInput, styles.disabledInput]}
                                value={street}
                                placeholder="Straatnaam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={false}
                            />
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Huisnummer</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={houseNumber}
                                    placeholder="Nr"
                                    placeholderTextColor={KribTheme.colors.text.secondary}
                                    editable={false}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                                <Text style={styles.label}>Postcode</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={postalCode}
                                    placeholder="1234 AB"
                                    placeholderTextColor={KribTheme.colors.text.secondary}
                                    editable={false}
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Stad</Text>
                            <TextInput
                                style={[styles.textInput, styles.disabledInput]}
                                value={city}
                                placeholder="Stad"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={false}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tijdzone</Text>
                            <TextInput
                                style={[styles.textInput, styles.disabledInput]}
                                value={timezone}
                                placeholder="Europe/Amsterdam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                editable={false}
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
                            Kies een foto voor op de homepage of plak een URL.
                        </Text>

                        <View style={styles.photoContainer}>
                            {photoUrl ? (
                                <Image
                                    source={{ uri: photoUrl }}
                                    style={styles.photoPreview}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                                    <ImageIcon size={32} color={KribTheme.colors.text.secondary} />
                                </View>
                            )}

                            {isAdmin && (
                                <View style={styles.photoActions}>
                                    <TouchableOpacity
                                        style={styles.photoButton}
                                        onPress={handleChangePhoto}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Camera size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                                <Text style={styles.photoButtonText}>{Strings.household.changePhoto}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {showLinkInput && isAdmin && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Foto URL</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.input, styles.textInput]}
                                        value={photoUrl}
                                        onChangeText={setPhotoUrl}
                                        placeholder="https://example.com/image.jpg"
                                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                        autoCapitalize="none"
                                        returnKeyType="done"
                                        onSubmitEditing={handleSave}
                                    />
                                    {photoUrl.length > 0 && (
                                        <TouchableOpacity onPress={() => setPhotoUrl('')} style={styles.clearButton}>
                                            <X size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Deadline Avondeten (HH:MM)</Text>
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
    disabledInput: {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
        color: '#6B7280',
    },
    addressNote: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginBottom: 12,
        marginTop: 8,
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
    photoContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    photoPreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    photoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5D5FEF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    photoButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});
