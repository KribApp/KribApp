import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { KribTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, MessageCircle } from 'lucide-react-native';

export default function SupportScreen() {
    const handleEmail = () => {
        Linking.openURL('mailto:info@kribapp.com?subject=Krib Support Request');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X
                        size={24}
                        color={KribTheme.colors.text.primary}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MessageCircle size={64} color={KribTheme.colors.primary} />
                </View>

                <Text style={styles.title}>How can we help?</Text>
                <Text style={styles.subtitle}>
                    We're here to help you get the most out of Krib. If you have any questions, bugs to report, or feature requests, please don't hesitate to reach out.
                </Text>

                <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
                    <Mail size={20} color="#FFF" />
                    <Text style={styles.contactButtonText}>Email info@kribapp.com</Text>
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoLabel}>Direct Contact:</Text>
                    <Text style={styles.infoValue}>info@kribapp.com</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        paddingTop: 60,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: KribTheme.colors.primary + '10', // 10% opacity
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        maxWidth: 400,
    },
    contactButton: {
        backgroundColor: KribTheme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        ...KribTheme.shadows.card,
    },
    contactButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
});
