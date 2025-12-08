import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Home, UserPlus } from 'lucide-react-native';

export default function HouseholdStart() {
    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.title}>Bijna klaar!</Text>
                <Text style={styles.subtitle}>Sluit je aan bij een huis of start een nieuwe.</Text>
            </View>

            <View style={styles.options}>
                <TouchableOpacity
                    style={[styles.card, styles.cardCreate]}
                    onPress={() => router.push('/(auth)/create-household')}
                >
                    <View style={styles.iconContainerCreate}>
                        <Home size={32} color="#8B5CF6" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>Nieuw Huis Starten</Text>
                        <Text style={styles.cardDescription}>Ik ben de eerste</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, styles.cardJoin]}
                    onPress={() => router.push('/(auth)/join-household')}
                >
                    <View style={styles.iconContainerJoin}>
                        <UserPlus size={32} color="#F59E0B" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>Bij een huis voegen</Text>
                        <Text style={styles.cardDescription}>Ik heb een code</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => {
                // Temporary logout for testing
                router.replace('/(auth)/login');
            }} style={{ marginTop: 40 }}>
                <Text style={{ color: 'white', opacity: 0.8 }}>Terug naar login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#5D5FEF', // Indigo Background
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF', // White text
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF', // White text
        textAlign: 'center',
        opacity: 0.9,
    },
    options: {
        width: '100%',
        gap: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        // borderWidth: 1,
        // borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardCreate: {
        // borderLeftWidth: 4,
        // borderLeftColor: '#8B5CF6',
    },
    cardJoin: {
        // borderLeftWidth: 4,
        // borderLeftColor: '#F59E0B',
    },
    iconContainerCreate: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconContainerJoin: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
});
