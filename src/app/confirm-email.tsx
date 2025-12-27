import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { Stack } from 'expo-router';
import { KribTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Smartphone, Apple } from 'lucide-react-native';

export default function ConfirmEmailScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Logo */}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/krib-logo-v3.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <CheckCircle2 size={80} color="#10B981" />
                </View>

                <Text style={styles.title}>E-mail bevestigd! 🎉</Text>
                <Text style={styles.subtitle}>
                    Bedankt voor het bevestigen van je e-mailadres. Je account is nu geactiveerd en je kunt inloggen in de Krib app.
                </Text>

                {/* App Store Info */}
                <View style={styles.appInfoSection}>
                    <Text style={styles.appInfoTitle}>Open de app om in te loggen</Text>
                    <Text style={styles.appInfoText}>
                        Heb je de app nog niet? Download Krib gratis:
                    </Text>

                    <View style={styles.appStoreContainer}>
                        <View style={styles.appStoreBadge}>
                            <Apple size={20} color="#FFF" />
                            <View>
                                <Text style={styles.appStoreLabel}>Download in de</Text>
                                <Text style={styles.appStoreName}>App Store</Text>
                            </View>
                        </View>
                        <View style={styles.appStoreBadge}>
                            <Smartphone size={20} color="#FFF" />
                            <View>
                                <Text style={styles.appStoreLabel}>Beschikbaar op</Text>
                                <Text style={styles.appStoreName}>Google Play</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2025 Krib App. Alle rechten voorbehouden.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    logo: {
        width: 80,
        height: 32,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#10B98115',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 16,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    },
    subtitle: {
        fontSize: 18,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 48,
        fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    },
    appInfoSection: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        width: '100%',
    },
    appInfoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    appInfoText: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'center',
    },
    appStoreContainer: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    appStoreBadge: {
        backgroundColor: '#111827',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    appStoreLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '500',
    },
    appStoreName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        paddingVertical: 24,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    footerText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
