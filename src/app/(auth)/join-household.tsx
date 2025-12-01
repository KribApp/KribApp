import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../theme/theme';
export default function JoinHousehold() {
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);

    async function joinHousehold() {
        if (!inviteCode) {
            Alert.alert('Fout', 'Vul een code in.');
            return;
        }

        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Find Household by code
        const { data: household, error: houseError } = await supabase
            .from('households')
            .select('id, name')
            .eq('invite_code', inviteCode.toUpperCase())
            .single();

        if (houseError || !household) {
            Alert.alert('Fout', 'Geen huis gevonden met deze code.');
            setLoading(false);
            return;
        }

        // 2. Add user as Member
        const { error: memberError } = await supabase
            .from('household_members')
            .insert([
                {
                    household_id: household.id,
                    user_id: user.id,
                    role: 'MEMBER',
                }
            ]);

        if (memberError) {
            if (memberError.code === '23505') { // Unique violation
                Alert.alert('Info', 'Je bent al lid van dit huis.');
                router.replace('/(app)/dashboard');
            } else {
                Alert.alert('Error joining household', memberError.message);
            }
            setLoading(false);
            return;
        }

        setLoading(false);
        Alert.alert('Succes', `Welkom bij ${household.name}!`);
        router.replace('/(app)/dashboard');
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <StatusBar style="dark" />
                    <View style={styles.header}>
                        <Text style={styles.title}>Huis Joinen</Text>
                        <Text style={styles.subtitle}>Voer de code in die je hebt gekregen.</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Uitnodigingscode</Text>
                            <TextInput
                                style={styles.input}
                                onChangeText={setInviteCode}
                                value={inviteCode}
                                placeholder="Bijv. 123456"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={joinHousehold}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={joinHousehold}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={KribTheme.colors.text.inverse} />
                            ) : (
                                <Text style={styles.buttonText}>Join Huis</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Terug</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
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
        backgroundColor: '#F59E0B', // Amber for joining
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        alignItems: 'center',
        padding: 10,
    },
    backButtonText: {
        color: '#6B7280',
        fontSize: 16,
    }
});
