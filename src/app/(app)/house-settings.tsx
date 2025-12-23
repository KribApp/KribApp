import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';
import { Save, ArrowLeft, X, Clock, Camera, Link as LinkIcon, Image as ImageIcon, MapPin, Hash, LogOut, Users } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { KribTheme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { Strings } from '../../constants/strings';
import { DiningService } from '../../services/DiningService';

export default function HouseSettings() {
    const router = useRouter();
    const { household, member, loading: contextLoading, refreshHousehold } = useHousehold();
    const { theme, isDarkMode } = useTheme();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
            setShowLinkInput(!household.photo_url);
        }
    }, [household]);

    const uploadImage = async (uri: string) => {
        try {
            setUploading(true);

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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uploadedUrl = await uploadImage(result.assets[0].uri);
            if (uploadedUrl) {
                setPhotoUrl(uploadedUrl);
                setShowLinkInput(false);
                handleDirectSave({ photo_url: uploadedUrl });
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

    const performAutoSave = async (updates: any) => {
        if (!isAdmin || !householdId) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('households')
                .update(updates)
                .eq('id', householdId);

            if (error) {
                console.error('Error auto-saving:', error);
            } else {
                // await refreshHousehold(); // Optional: might cause flickering if we refresh full data on every keystroke
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const debouncedSave = (updates: any) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            performAutoSave(updates);
        }, 1000); // 1 sec debounce
    };

    // Update handlers
    const handleNameChange = (text: string) => {
        setName(text);
        debouncedSave({ name: text });
    };

    const handlePhotoUrlChange = (text: string) => {
        setPhotoUrl(text);
        debouncedSave({ photo_url: text });
    };

    const handleDeadlineChange = (timeStr: string) => {
        setDeadlineTime(timeStr);
        performAutoSave({ config_deadline_time: timeStr });
    };

    // Direct save for non-text inputs (Switch, Image Picker)
    const handleDirectSave = async (updates: any) => {
        if (!isAdmin || !householdId) return;
        setSaving(true);
        const { error } = await supabase
            .from('households')
            .update(updates)
            .eq('id', householdId);

        if (error) console.error(error);
        else await refreshHousehold();

        setSaving(false);
    };

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
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity onPress={() => router.replace('/(app)/house-info')} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Huis Instellingen</Text>
                    {saving && <ActivityIndicator size="small" color={theme.colors.onBackground} style={{ marginTop: 4, height: 10 }} />}
                </View>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                    {/* SECTION: GENERAL */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: 'rgba(255,255,255,0.7)' }]}>ALGEMEEN</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                        <View style={styles.photoContainer}>
                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={[styles.photoPreview, { backgroundColor: theme.colors.inputBackground }]} contentFit="cover" />
                            ) : (
                                <View style={[styles.photoPreview, styles.photoPlaceholder, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                    <ImageIcon size={32} color={theme.colors.text.secondary} />
                                </View>
                            )}

                            {isAdmin && (
                                <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]} onPress={handleChangePhoto} disabled={uploading}>
                                    {uploading ? (
                                        <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                                    ) : (
                                        <Camera size={20} color={theme.colors.text.inverse} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {showLinkInput && isAdmin && (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Foto URL</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                    <LinkIcon size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text.primary }]}
                                        value={photoUrl}
                                        onChangeText={handlePhotoUrlChange}
                                        placeholder="https://example.com/image.jpg"
                                        placeholderTextColor={theme.colors.text.secondary}
                                        autoCapitalize="none"
                                    />
                                    {photoUrl.length > 0 && (
                                        <TouchableOpacity onPress={() => setPhotoUrl('')} style={{ padding: 4 }}>
                                            <X size={20} color={theme.colors.text.secondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Naam Huishouden</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <Users size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text.primary }]}
                                    value={name}
                                    onChangeText={handleNameChange}
                                    placeholder="Naam"
                                    placeholderTextColor={theme.colors.text.secondary}
                                    editable={isAdmin}
                                />
                            </View>
                        </View>
                    </View>

                    {/* SECTION: LOCATIE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: 'rgba(255,255,255,0.7)' }]}>LOCATIE (ALLEEN LEZEN)</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Adres</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <MapPin size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text.secondary }]}
                                    value={`${street} ${houseNumber}`}
                                    editable={false}
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Postcode</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                    <TextInput style={[styles.input, { color: theme.colors.text.secondary }]} value={postalCode} editable={false} />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 2, marginLeft: 8 }]}>
                                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Stad</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                    <TextInput style={[styles.input, { color: theme.colors.text.secondary }]} value={city} editable={false} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* SECTION: CONFIG */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: 'rgba(255,255,255,0.7)' }]}>EETLIJST CONFIGURATIE</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Deadline Avondeten</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <Clock size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                {Platform.OS === 'android' && (
                                    <TouchableOpacity
                                        style={[styles.input, { justifyContent: 'center' }]}
                                        onPress={() => isAdmin && setShowTimePicker(true)}
                                    >
                                        <Text style={{ color: theme.colors.text.primary }}>{deadlineTime.substring(0, 5)}</Text>
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
                                                handleDeadlineChange(`${hours}:${minutes}:00`);
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
                                                handleDeadlineChange(`${hours}:${minutes}:00`);
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>Standaard Mee-eten</Text>
                                <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
                                    {noResponseAction === 'EAT'
                                        ? "Iedereen eet mee, tenzij afgemeld"
                                        : "Niemand eet mee, tenzij aangemeld"}
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={noResponseAction === 'EAT' ? theme.colors.surface : "#f4f3f4"}
                                onValueChange={async (val) => {
                                    if (!isAdmin) return;

                                    const newValue = val ? 'EAT' : 'NO_EAT';
                                    setNoResponseAction(newValue);
                                    handleDirectSave({ config_no_response_action: newValue });

                                    // If toggled ON, immediately apply "Mee-eten" for today for missing members
                                    if (newValue === 'EAT' && householdId) {
                                        try {
                                            const count = await DiningService.applyDefaultEatingForToday(householdId);
                                            if (count > 0) {
                                                Alert.alert(
                                                    "Eetlijst Bijgewerkt",
                                                    `${count} lid/leden zijn op 'Mee-eten' gezet voor vandaag.`
                                                );
                                            }
                                        } catch (err) {
                                            console.error("Failed to auto-set eating status:", err);
                                        }
                                    }
                                }}
                                value={noResponseAction === 'EAT'}
                                disabled={!isAdmin}
                            />
                        </View>
                    </View>

                    {/* SECTION: INVITE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: 'rgba(255,255,255,0.7)' }]}>UITNODIGINGSCODE</Text>
                    </View>
                    <View style={[styles.card, { alignItems: 'center', backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                        <Text style={[styles.inviteCode, { color: theme.colors.primary }]}>{inviteCode}</Text>
                        <Text style={[styles.helperText, { color: theme.colors.text.secondary }]}>Deel deze code met huisgenoten</Text>
                    </View>

                    {/* Save Button Removed - Auto Save Implemented */}

                    {!isAdmin && (
                        <Text style={[styles.warningText, { color: theme.colors.text.secondary }]}>Alleen beheerders kunnen deze instellingen wijzigen.</Text>
                    )}

                    {/* DANGER ZONE */}
                    <View style={[styles.sectionHeaderContainer, { marginTop: 32 }]}>
                        <Text style={[styles.sectionHeaderText, { color: theme.colors.error }]}>DANGER ZONE</Text>
                    </View>
                    <View style={[styles.card, { borderColor: theme.colors.error, borderWidth: 1, backgroundColor: theme.colors.surface }]}>
                        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveHousehold}>
                            <LogOut size={20} color={theme.colors.error} />
                            <Text style={[styles.leaveButtonText, { color: theme.colors.error }]}>Verlaat Huis</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
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
        backgroundColor: KribTheme.colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: KribTheme.colors.primary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 16,
        paddingTop: 8,
    },
    sectionHeaderContainer: {
        marginBottom: 8,
        marginTop: 16,
        paddingHorizontal: 4,
    },
    sectionHeaderText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...KribTheme.shadows.card,
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    photoPreview: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    photoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: -16,
        right: 16,
        backgroundColor: '#5D5FEF',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    row: {
        flexDirection: 'row',
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        backgroundColor: KribTheme.colors.primary,
        marginTop: 24,
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    settingSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    inviteCode: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#5D5FEF',
        letterSpacing: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        gap: 8,
    },
    leaveButtonText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
