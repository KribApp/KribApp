import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { router } from 'expo-router';
import { KribTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Wallet, CalendarDays, Smartphone, Apple, Mail } from 'lucide-react-native';

export default function LandingPage() {
    const { width } = useWindowDimensions();
    const isMobileWeb = width < 768;

    const handleEmailContact = () => {
        Linking.openURL('mailto:info@kribapp.com');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Navbar - Logo only, no auth buttons */}
                <View style={styles.navBar}>
                    <View style={styles.logoRow}>
                        <Image
                            source={require('../../assets/krib-logo-v3.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Hero Section */}
                <View style={[styles.heroSection, isMobileWeb && styles.heroSectionMobile]}>
                    <View style={[styles.heroContent, isMobileWeb && styles.heroContentMobile]}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>🎉 Nu beschikbaar voor iOS en Android</Text>
                        </View>
                        <Text style={styles.heroTitle}>
                            Je huishouden regelen was nog nooit zo <Text style={styles.highlightText}>makkelijk</Text>.
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            De alles-in-één app voor huisgenoten, gezinnen en koppels. Beheer taken, uitgaven en je agenda op één plek. Zonder gedoe.
                        </Text>

                        {/* App Store Badges */}
                        <View style={[styles.appStoreContainer, isMobileWeb && styles.appStoreContainerMobile]}>
                            <View style={styles.appStoreBadge}>
                                <Apple size={24} color="#FFF" />
                                <View>
                                    <Text style={styles.appStoreLabel}>Download in de</Text>
                                    <Text style={styles.appStoreName}>App Store</Text>
                                </View>
                            </View>
                            <View style={styles.appStoreBadge}>
                                <Smartphone size={24} color="#FFF" />
                                <View>
                                    <Text style={styles.appStoreLabel}>Beschikbaar op</Text>
                                    <Text style={styles.appStoreName}>Google Play</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>100%</Text>
                                <Text style={styles.statLabel}>Gratis</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>3+</Text>
                                <Text style={styles.statLabel}>Tools</Text>
                            </View>
                        </View>
                    </View>

                    {/* Hero Visual - Premium App Mockup */}
                    <View style={[styles.heroVisual, isMobileWeb && styles.heroVisualMobile]}>
                        <View style={styles.phoneMockup}>
                            <View style={styles.phoneScreen}>
                                {/* Mock Header */}
                                <View style={styles.mockHeader}>
                                    <View style={styles.mockAvatar} />
                                    <View>
                                        <Text style={styles.mockGreeting}>Hoi, Michiel👋</Text>
                                        <Text style={styles.mockSubtext}>Welkom thuis!</Text>
                                    </View>
                                </View>

                                {/* Mock Balance Card */}
                                <View style={styles.mockCard}>
                                    <Text style={styles.mockCardLabel}>Huidige Balans</Text>
                                    <Text style={styles.mockCardValue}>+ € 24,50</Text>
                                    <View style={styles.mockProgressBar}>
                                        <View style={[styles.mockProgressFill, { width: '60%' }]} />
                                    </View>
                                </View>

                                {/* Mock Tasks */}
                                <Text style={styles.mockSectionTitle}>Mijn Taken</Text>
                                <View style={styles.mockTaskRow}>
                                    <View style={styles.mockCheckbox} />
                                    <Text style={styles.mockTaskText}>Vuilnis buiten zetten</Text>
                                </View>
                                <View style={styles.mockTaskRow}>
                                    <View style={[styles.mockCheckbox, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}>
                                        <CheckCircle2 size={12} color="#10B981" />
                                    </View>
                                    <Text style={[styles.mockTaskText, { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                                        Vaatwasser uitruimen
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Floating Cards for "3D" Effect */}
                        <View style={styles.floatingCardLeft}>
                            <Wallet size={24} color={KribTheme.colors.primary} />
                            <Text style={styles.floatingCardText}>Wie betaalt wat?</Text>
                        </View>
                        <View style={styles.floatingCardRight}>
                            <CalendarDays size={24} color="#F59E0B" />
                            <Text style={styles.floatingCardText}>Samen eten!</Text>
                        </View>
                    </View>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionOverline}>FEATURES</Text>
                        <Text style={styles.sectionTitle}>Alles wat je nodig hebt.</Text>
                        <Text style={styles.sectionSubtitle}>Geen losse lijstjes en tikkies meer. Krib bundelt alles in één overzichtelijk dashboard.</Text>
                    </View>

                    <View style={styles.featuresGrid}>
                        <FeatureCard
                            icon={<CheckCircle2 size={32} color={KribTheme.colors.primary} />}
                            title="Takenlijst"
                            description="Verdeel taken eerlijk en streep ze af. Ons slimme algoritme zorgt voor een eerlijke verdeling."
                        />
                        <FeatureCard
                            icon={<Wallet size={32} color={KribTheme.colors.primary} />}
                            title="Pot & Uitgaven"
                            description="Houd bij wie wat betaalt. Verreken kosten eenvoudig en zie direct wie er nog in de min staat."
                        />
                        <FeatureCard
                            icon={<CalendarDays size={32} color={KribTheme.colors.primary} />}
                            title="Agenda & Eten"
                            description="Zie wie er thuis is en wie er mee eet. Nooit meer te veel of te weinig koken."
                        />
                    </View>
                </View>

                {/* CTA Bottom - App Store Info */}
                <View style={styles.bottomCtaSection}>
                    <View style={styles.bottomCtaCard}>
                        <Text style={styles.bottomCtaTitle}>Klaar voor meer rust in huis?</Text>
                        <Text style={styles.bottomCtaSubtitle}>Download Krib gratis in de App Store of Google Play Store en begin vandaag nog.</Text>
                        <View style={[styles.appStoreContainer, { marginTop: 24 }]}>
                            <View style={[styles.appStoreBadge, styles.appStoreBadgeLight]}>
                                <Apple size={24} color="#111827" />
                                <View>
                                    <Text style={[styles.appStoreLabel, { color: '#6B7280' }]}>Download in de</Text>
                                    <Text style={[styles.appStoreName, { color: '#111827' }]}>App Store</Text>
                                </View>
                            </View>
                            <View style={[styles.appStoreBadge, styles.appStoreBadgeLight]}>
                                <Smartphone size={24} color="#111827" />
                                <View>
                                    <Text style={[styles.appStoreLabel, { color: '#6B7280' }]}>Beschikbaar op</Text>
                                    <Text style={[styles.appStoreName, { color: '#111827' }]}>Google Play</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer with links */}
                <View style={styles.footer}>
                    <View style={styles.logoRow}>
                        <Image
                            source={require('../../assets/krib-logo-v3.png')}
                            style={[styles.logo, { tintColor: '#9CA3AF' }]}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Footer Links */}
                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/privacy')}>
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </Pressable>
                        <Text style={styles.footerDivider}>•</Text>
                        <Pressable onPress={() => router.push('/support')}>
                            <Text style={styles.footerLink}>Contact & Support</Text>
                        </Pressable>
                        <Text style={styles.footerDivider}>•</Text>
                        <Pressable onPress={handleEmailContact}>
                            <Text style={styles.footerLink}>info@kribapp.com</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.copyright}>© 2025 Krib App. Alle rechten voorbehouden.</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
                {icon}
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 80,
        height: 32,
    },

    // Hero Section
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 80,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        gap: 64,
    },
    heroSectionMobile: {
        flexDirection: 'column',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 48,
    },
    heroContent: {
        flex: 1,
        gap: 24,
    },
    heroContentMobile: {
        alignItems: 'center',
    },
    badge: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 99,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    badgeText: {
        color: KribTheme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    heroTitle: {
        fontSize: 56,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 64,
        fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    },
    highlightText: {
        color: KribTheme.colors.primary,
    },
    heroSubtitle: {
        fontSize: 20,
        color: '#4B5563',
        lineHeight: 30,
        maxWidth: 540,
        fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    },

    // App Store Badges
    appStoreContainer: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
        flexWrap: 'wrap',
    },
    appStoreContainerMobile: {
        justifyContent: 'center',
    },
    appStoreBadge: {
        backgroundColor: '#111827',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appStoreBadgeLight: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    appStoreLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500',
    },
    appStoreName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        marginTop: 12,
    },
    statItem: {
        gap: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#E5E7EB',
    },

    // Hero Visual
    heroVisual: {
        flex: 1,
        height: 600,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroVisualMobile: {
        width: '100%',
        height: 450,
    },
    phoneMockup: {
        width: 300,
        height: 580,
        backgroundColor: '#111827',
        borderRadius: 40,
        borderWidth: 8,
        borderColor: '#1F2937',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.25,
        shadowRadius: 50,
        elevation: 20,
        transform: [{ rotate: '-3deg' }],
    },
    phoneScreen: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        padding: 24,
        paddingTop: 48,
    },
    mockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    mockAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#D1D5DB',
    },
    mockGreeting: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    mockSubtext: {
        fontSize: 14,
        color: '#6B7280',
    },
    mockCard: {
        backgroundColor: KribTheme.colors.primary,
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
    },
    mockCardLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 8,
    },
    mockCardValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 16,
    },
    mockProgressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    mockProgressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
    },
    mockSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    mockTaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    mockCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mockTaskText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },

    // Floating Elements
    floatingCardLeft: {
        position: 'absolute',
        left: 0,
        bottom: 150,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        transform: [{ rotate: '5deg' }],
    },
    floatingCardRight: {
        position: 'absolute',
        right: 0,
        top: 100,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        transform: [{ rotate: '-5deg' }],
    },
    floatingCardText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },

    // Features Section
    featuresSection: {
        paddingVertical: 96,
        paddingHorizontal: 24,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
    },
    sectionHeader: {
        alignItems: 'center',
        marginBottom: 64,
        maxWidth: 700,
    },
    sectionOverline: {
        color: KribTheme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 40,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 18,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 28,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 32,
        maxWidth: 1200,
        width: '100%',
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 24,
        width: 340,
        minHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    featureIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    featureTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    featureDescription: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 26,
    },

    // Bottom CTA
    bottomCtaSection: {
        paddingVertical: 96,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    bottomCtaCard: {
        backgroundColor: '#111827',
        borderRadius: 32,
        padding: 64,
        maxWidth: 1200,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bottomCtaTitle: {
        fontSize: 40,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
    },
    bottomCtaSubtitle: {
        fontSize: 20,
        color: '#9CA3AF',
        textAlign: 'center',
        maxWidth: 600,
    },

    // Footer
    footer: {
        paddingVertical: 48,
        paddingHorizontal: 32,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    footerLink: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    footerDivider: {
        color: '#D1D5DB',
        fontSize: 14,
    },
    copyright: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
