import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu, Send } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { KribTheme } from '../../theme/theme';

export default function Chat() {
    const navigation = useNavigation();
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchMessages();
            const subscription = subscribeToMessages();
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [householdId]);

    async function fetchHouseholdAndUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            setUserId(user.id);

            const { data: member } = await supabase
                .from('household_members')
                .select('household_id')
                .eq('user_id', user.id)
                .single();

            if (member) {
                setHouseholdId(member.household_id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching household:', error);
            setLoading(false);
        }
    }

    async function fetchMessages() {
        if (!householdId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*, users(username)')
                .eq('household_id', householdId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                setMessages(data);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToMessages() {
        return supabase
            .channel('chat_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `household_id=eq.${householdId}`,
                },
                async (payload) => {
                    // Fetch user details for the new message
                    const { data: user } = await supabase
                        .from('users')
                        .select('username')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMessage: any = {
                        ...payload.new,
                        users: user,
                    };

                    setMessages((prev) => {
                        // Prevent duplicates (e.g. from optimistic update)
                        if (prev.some(m => m.id === newMessage.id)) {
                            return prev;
                        }
                        return [...prev, newMessage];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            )
            .subscribe();
    }

    async function sendMessage() {
        if (!message.trim() || !householdId || !userId) return;

        const content = message.trim();
        setMessage('');

        // Generate a temporary ID (UUID v4 format)
        const tempId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const optimisticMessage = {
            id: tempId,
            household_id: householdId,
            user_id: userId,
            content,
            message_type: 'TEXT',
            created_at: new Date().toISOString(),
            users: { username: 'Ik' } // Placeholder
        };

        // Optimistically add message
        setMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        const { error } = await supabase
            .from('chat_messages')
            .insert([
                {
                    id: tempId,
                    household_id: householdId,
                    user_id: userId,
                    content,
                    message_type: 'TEXT',
                }
            ]);

        if (error) {
            console.error('Error sending message:', error);
            alert('Kon bericht niet versturen. Probeer het opnieuw.');
            // Remove the optimistic message on error
            setMessages((prev) => prev.filter(m => m.id !== tempId));
        }
    }

    function getDateLabel(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return 'Vandaag';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Gisteren';
        } else {
            return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
        }
    }

    const renderMessage = ({ item, index }: { item: any, index: number }) => {
        const isOwnMessage = item.user_id === userId;
        const isSystemMessage = item.message_type === 'SYSTEM_ALERT';

        const showDateDivider = (() => {
            if (index === 0) return true;
            const prevMessage = messages[index - 1];
            const prevDate = new Date(prevMessage.created_at).toDateString();
            const currDate = new Date(item.created_at).toDateString();
            return prevDate !== currDate;
        })();

        if (isSystemMessage) {
            return (
                <View>
                    {showDateDivider && (
                        <View style={styles.dateDivider}>
                            <Text style={styles.dateDividerText}>{getDateLabel(item.created_at)}</Text>
                        </View>
                    )}
                    <View style={styles.systemMessageContainer}>
                        <Text style={styles.systemMessageText}>{item.content}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View>
                {showDateDivider && (
                    <View style={styles.dateDivider}>
                        <Text style={styles.dateDividerText}>{getDateLabel(item.created_at)}</Text>
                    </View>
                )}
                <View style={[
                    styles.messageContainer,
                    isOwnMessage ? styles.ownMessage : styles.otherMessage
                ]}>
                    {!isOwnMessage && (
                        <Text style={styles.senderName}>{item.users?.username || 'Onbekend'}</Text>
                    )}
                    <Text style={[
                        styles.messageText,
                        isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                    ]}>{item.content}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={styles.headerTitle}>Chat</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.chatContainer}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.chatContent}
                        ListEmptyComponent={
                            <View style={styles.emptyChat}>
                                <Text style={styles.emptyChatText}>Nog geen berichten vandaag.</Text>
                            </View>
                        }
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Typ een bericht..."
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <Send size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    chatContainer: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    chatContent: {
        padding: 16,
        paddingBottom: 20,
    },
    emptyChat: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyChatText: {
        color: '#FFFFFF',
        fontStyle: 'italic',
    },
    messageContainer: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        maxWidth: '80%',
        ...KribTheme.shadows.card,
        shadowOpacity: 0.05, // Lighter shadow for messages
    },
    ownMessage: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: '#E5E7EB', // Light Grey
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 12,
        color: '#000000',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
    },
    ownMessageText: {
        color: '#000000',
    },
    otherMessageText: {
        color: '#000000',
    },
    systemMessageContainer: {
        alignSelf: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    systemMessageText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: 32,
        backgroundColor: KribTheme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: KribTheme.colors.border,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 12,
        color: '#FFFFFF',
    },
    sendButton: {
        backgroundColor: KribTheme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateDivider: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateDividerText: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
        backgroundColor: KribTheme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
});
