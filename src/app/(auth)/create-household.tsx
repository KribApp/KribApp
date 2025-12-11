import { useState, useEffect, useRef } from 'react';
import tzlookup from 'tz-lookup';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { StatusBar } from 'expo-status-bar';
import { useHousehold } from '../../context/HouseholdContext';

import { SafeAreaView } from 'react-native-safe-area-context';
import { KribTheme } from '../../theme/theme';

export default function CreateHousehold() {
    const [name, setName] = useState('');
    const [streetAndNumber, setStreetAndNumber] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const { refreshHousehold } = useHousehold();

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const [loading, setLoading] = useState(false);

    const addressRef = useRef<TextInput>(null);
    const postalCodeRef = useRef<TextInput>(null);
    const cityRef = useRef<TextInput>(null);
    const provinceRef = useRef<TextInput>(null);
    const countryRef = useRef<TextInput>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (streetAndNumber.length > 2 && showSuggestions) {
                fetchAddressSuggestions(streetAndNumber);
            } else if (streetAndNumber.length <= 2) {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [streetAndNumber, showSuggestions]);

    async function fetchAddressSuggestions(query: string) {
        setLoadingSuggestions(true);
        try {
            // Removed countrycodes=nl to allow global addresses
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
                {
                    headers: {
                        'User-Agent': 'Krib/1.0'
                    }
                }
            );
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error('Error fetching address suggestions:', error);
        } finally {
            setLoadingSuggestions(false);
        }
    }

    function handleSelectSuggestion(item: any) {
        const address = item.address;
        const street = address.road || '';
        const number = address.house_number || '';
        const postcode = address.postcode || '';
        const town = address.city || address.town || address.village || address.municipality || '';
        const state = address.state || address.province || '';
        const countryName = address.country || '';

        // Store full item to get lat/lon later
        setStreetAndNumber(`${street} ${number}`.trim());
        setPostalCode(postcode);
        setCity(town);
        setProvince(state);
        setCountry(countryName);

        // We'll use the last selected item for timezone lookup
        // Ideally we should store this in state, but for now we can just use the item passed here
        // if the user doesn't change the text. 
        // Better approach: Store the selected location details
        setSelectedLocation({
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            country: address.country
        });

        setShowSuggestions(false);
        Keyboard.dismiss();
    }

    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lon: number, country: string } | null>(null);

    function generateInviteCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async function createHousehold() {
        if (!name) {
            Alert.alert('Fout', 'Vul een naam in voor je huis.');
            return;
        }
        // Address is now optional, so no validation here
        // if (!streetAndNumber || !postalCode || !city) {
        //     Alert.alert('Fout', 'Vul een volledig adres in.');
        //     return;
        // }

        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const inviteCode = generateInviteCode();
        // Construct full address string
        const addressParts = [streetAndNumber, postalCode, city, province, country].filter(Boolean);
        const fullAddress = addressParts.join(', ');

        let timezone = 'Europe/Amsterdam'; // Default
        let countryName = 'Netherlands';

        if (selectedLocation) {
            try {
                timezone = tzlookup(selectedLocation.lat, selectedLocation.lon);
                countryName = selectedLocation.country || countryName;
            } catch (e) {
                console.warn('Could not determine timezone, using default', e);
            }
        }

        // 1. Create Household
        // Split street and number roughly (this is a simple heuristic, ideally we use the structured data from nominatim if available)
        // Since we only have the string streetAndNumber here if user typed manually, we might just put it all in street or try to split.
        // But wait, we set streetAndNumber from nominatim result too.
        // Let's try to use the state if we can, but we don't have separate state for street/number.
        // For now, let's put the full streetAndNumber string into 'street' and leave 'house_number' empty if we can't parse it easily,
        // OR just save streetAndNumber to street.
        // Actually, the user requested "Straatnaam en huisnummer" as one field.
        // Let's just save that entire string to 'street' for now, or 'street' and 'house_number' if we want to be strict.
        // Given the UI has one field, let's save it to 'street' and maybe 'house_number' if we can extract it.
        // Simple regex to extract last number?
        const match = streetAndNumber.match(/^(.+?)\s+(\d+[\w-]*)$/);
        let streetVal = streetAndNumber;
        let numberVal = '';
        if (match) {
            streetVal = match[1];
            numberVal = match[2];
        }

        const { data: household, error: houseError } = await supabase
            .from('households')
            .insert([
                {
                    name,
                    street: streetVal,
                    house_number: numberVal,
                    postal_code: postalCode,
                    city: city,
                    province: province,
                    country: countryName,
                    admin_user_id: user.id,
                    invite_code: inviteCode,
                    timezone: timezone,
                }
            ])
            .select()
            .single();

        if (houseError) {
            Alert.alert('Error creating household', houseError.message);
            setLoading(false);
            return;
        }

        // 2. Add user as Admin Member
        const { error: memberError } = await supabase
            .from('household_members')
            .insert([
                {
                    household_id: household.id,
                    user_id: user.id,
                    role: 'ADMIN',
                }
            ]);

        if (memberError) {
            Alert.alert('Error joining household', memberError.message);
            setLoading(false);
            return;
        }



        setLoading(false);
        Alert.alert('Succes', `Huis '${name}' aangemaakt! Je code is: ${inviteCode}`);
        await refreshHousehold();
        router.replace('/(app)/dashboard');
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: KribTheme.colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.container}>
                    <StatusBar style="light" />
                    <View style={styles.header}>
                        <Text style={styles.title}>Nieuw Huis</Text>
                        <Text style={styles.subtitle}>Maak een nieuw huishouden aan.</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Huisnaam</Text>
                            <TextInput
                                style={styles.input}
                                onChangeText={setName}
                                value={name}
                                placeholder="Bijv. Huize Gezellig"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="next"
                                onSubmitEditing={() => addressRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 10 }]}>
                            <Text style={styles.label}>Straatnaam en huisnummer</Text>
                            <TextInput
                                ref={addressRef}
                                style={styles.input}
                                onChangeText={(text) => {
                                    setStreetAndNumber(text);
                                    setShowSuggestions(true);
                                }}
                                value={streetAndNumber}
                                placeholder="Straatnaam 123"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="next"
                                onSubmitEditing={() => postalCodeRef.current?.focus()}
                                blurOnSubmit={false}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    {loadingSuggestions ? (
                                        <ActivityIndicator style={{ padding: 10 }} />
                                    ) : (
                                        suggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectSuggestion(item)}
                                            >
                                                <Text style={styles.suggestionText}>{item.display_name}</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>



                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Postcode</Text>
                            <TextInput
                                ref={postalCodeRef}
                                style={styles.input}
                                onChangeText={setPostalCode}
                                value={postalCode}
                                placeholder="1234 AB"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="next"
                                onSubmitEditing={() => cityRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Stad</Text>
                            <TextInput
                                ref={cityRef}
                                style={styles.input}
                                onChangeText={setCity}
                                value={city}
                                placeholder="Amsterdam"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="next"
                                onSubmitEditing={() => provinceRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Provincie</Text>
                            <TextInput
                                ref={provinceRef}
                                style={styles.input}
                                onChangeText={setProvince}
                                value={province}
                                placeholder="Noord-Holland"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="next"
                                onSubmitEditing={() => countryRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Land</Text>
                            <TextInput
                                ref={countryRef}
                                style={styles.input}
                                onChangeText={setCountry}
                                value={country}
                                placeholder="Nederland"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                        </View>



                        <TouchableOpacity
                            style={styles.button}
                            onPress={createHousehold}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={KribTheme.colors.primary} />
                            ) : (
                                <Text style={styles.buttonText}>Aanmaken</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Terug</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
        position: 'relative',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
    },
    button: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: KribTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        alignItems: 'center',
        padding: 10,
    },
    backButtonText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 200,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionText: {
        fontSize: 14,
        color: '#374151',
    },

});
