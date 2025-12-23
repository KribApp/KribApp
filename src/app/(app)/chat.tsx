import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu, Send, User, Paperclip, Heart } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../../context/ThemeContext';
import { KribTheme } from '../../theme/theme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ImageViewerModal } from '../../components/ImageViewerModal';

export default function Chat() {
    const navigation = useNavigation();
    const { theme, isDarkMode } = useTheme();
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string, profile_picture_url: string | null } | null>(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            console.log('Fetching messages for household:', householdId);
            fetchMessages();
            const messageSub = subscribeToMessages();
            const reactionSub = subscribeToReactions();
            const presenceSub = subscribeToPresenseAndTyping();
            return () => {
                messageSub.unsubscribe();
                reactionSub.unsubscribe();
                presenceSub.unsubscribe();
            };
        }
    }, [householdId]);

    // ... fetchHouseholdAndUser remains the same ...

    async function fetchMessages() {
        if (!householdId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
                    *,
                    users (username, profile_picture_url),
                    message_reactions (
                        id,
                        reaction,
                        user_id
                    )
                `)
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
            .channel('chat_messages_channel')
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
                        .select('username, profile_picture_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMessage: any = {
                        ...payload.new,
                        users: user,
                        message_reactions: [] // Init empty reactions
                    };

                    setMessages((prev) => {
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

    function subscribeToReactions() {
        return supabase
            .channel('message_reactions_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'message_reactions' },
                async (payload) => {
                    // ... existing reaction logic ...
                    if (payload.eventType === 'INSERT') {
                        const newReaction = payload.new;
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === newReaction.message_id) {
                                return {
                                    ...msg,
                                    message_reactions: [...(msg.message_reactions || []), newReaction]
                                };
                            }
                            return msg;
                        }));
                    } else if (payload.eventType === 'DELETE') {
                        const deletedReaction = payload.old;
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === deletedReaction.message_id) {
                                return {
                                    ...msg,
                                    message_reactions: (msg.message_reactions || []).filter((r: any) => r.id !== deletedReaction.id)
                                };
                            }
                            return msg;
                        }));
                    }
                }
            )
            .subscribe();
    }

    function subscribeToPresenseAndTyping() {
        const channel = supabase.channel(`room_${householdId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.user_id !== userId) {
                    setTypingUsers(prev => {
                        if (!prev.includes(payload.payload.username)) {
                            return [...prev, payload.payload.username];
                        }
                        return prev;
                    });

                    // Clear after 3 seconds if no new event
                    // Ideally we'd have a timeout per user, but for simplicity:
                    setTimeout(() => {
                        setTypingUsers(prev => prev.filter(u => u !== payload.payload.username));
                    }, 3000);
                }
            })
            .subscribe();

        return channel;
    }

    async function broadcastTyping() {
        if (!householdId || !userId || !currentUserProfile) return;

        await supabase.channel(`room_${householdId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: userId, username: currentUserProfile.username },
        });
    }

    const handleTextChange = (text: string) => {
        setMessage(text);

        // Debounce typing broadcast
        if (!typingTimeoutRef.current) {
            broadcastTyping();
            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000); // Only send every 2s
        }
    };


    async function pickImage() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                await uploadAndSendMessage(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'Kon afbeelding niet openen.');
            console.error(error);
        }
    }

    async function uploadAndSendMessage(asset: ImagePicker.ImagePickerAsset) {
        if (!householdId || !userId || !asset.base64) return;
        setUploading(true);

        const fileName = `${householdId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        try {
            const { data, error } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, decode(asset.base64), {
                    contentType: 'image/jpeg',
                });

            if (error) {
                // Try to create bucket if it doesn't exist (hacky, better done in SQL or dashboard)
                // Just throw for now if fails
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            await sendMessage(undefined, publicUrl, 'image');

        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload mislukt', 'Kon afbeelding niet uploaden: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    const lastTap = useRef<number>(0);
    const handleDoubleTap = async (messageId: string) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
            toggleReaction(messageId, '❤️');
        } else {
            lastTap.current = now;
        }
    };

    async function toggleReaction(messageId: string, reaction: string) {
        if (!userId) return;

        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const existingReaction = message.message_reactions?.find(
            (r: any) => r.user_id === userId && r.reaction === reaction
        );

        if (existingReaction) {
            // Remove
            const { error } = await supabase
                .from('message_reactions')
                .delete()
                .eq('id', existingReaction.id);

            if (error) console.error(error);
        } else {
            // Add
            const { error } = await supabase
                .from('message_reactions')
                .insert({
                    message_id: messageId,
                    user_id: userId,
                    reaction
                });

            if (error) console.error(error);
        }
    }

    async function fetchHouseholdAndUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            setUserId(user.id);

            // Fetch current user profile
            const { data: profile } = await supabase
                .from('users')
                .select('username, profile_picture_url')
                .eq('id', user.id)
                .single();

            if (profile) {
                setCurrentUserProfile(profile);
            }

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

    async function sendMessage(text?: string, attachmentUrl?: string, attachmentType?: string) {
        if ((!text?.trim() && !attachmentUrl) || !householdId || !userId) return;

        const content = text?.trim() || (attachmentType === 'image' ? 'Afbeelding verzonden' : '');
        if (text) setMessage('');

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
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            created_at: new Date().toISOString(),
            users: {
                username: currentUserProfile?.username || 'Ik',
                profile_picture_url: currentUserProfile?.profile_picture_url
            },
            message_reactions: []
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
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType,
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

        const profileUrl = item.users?.profile_picture_url;
        const displayName = isOwnMessage
            ? `${item.users?.username || 'Ik'} (me)`
            : item.users?.username || 'Onbekend';

        const reactions = item.message_reactions || [];
        const heartCount = reactions.filter((r: any) => r.reaction === '❤️').length;
        const hasReacted = reactions.some((r: any) => r.user_id === userId && r.reaction === '❤️');

        return (
            <View>
                {showDateDivider && (
                    <View style={styles.dateDivider}>
                        <Text style={styles.dateDividerText}>{getDateLabel(item.created_at)}</Text>
                    </View>
                )}
                <View style={[
                    styles.messageRow,
                    isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow
                ]}>
                    <View style={styles.avatarContainer}>
                        {profileUrl ? (
                            <Image
                                source={{ uri: profileUrl }}
                                style={styles.avatarImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: isOwnMessage ? theme.colors.primary : theme.colors.text.secondary }]}>
                                <User size={16} color={theme.colors.text.inverse} />
                            </View>
                        )}
                    </View>

                    <View style={[
                        styles.messageContentWrapper,
                        isOwnMessage ? styles.ownMessageContentWrapper : styles.otherMessageContentWrapper
                    ]}>
                        <Text style={[styles.senderName, { color: theme.colors.onBackground }, isOwnMessage && { textAlign: 'right' }]}>{displayName}</Text>

                        <TouchableOpacity
                            onPress={() => {
                                if (item.attachment_type === 'image' && item.attachment_url) {
                                    setViewingImage(item.attachment_url);
                                } else {
                                    handleDoubleTap(item.id);
                                }
                            }}
                            activeOpacity={0.9}
                            style={[
                                styles.messageContainer,
                                isOwnMessage ? [styles.ownMessage, { backgroundColor: theme.colors.surface }] : [styles.otherMessage, { backgroundColor: theme.colors.inputBackground }],
                                item.attachment_type === 'image' && styles.imageMessageContainer
                            ]}
                        >
                            {item.attachment_type === 'image' && item.attachment_url ? (
                                <Image
                                    source={{ uri: item.attachment_url }}
                                    style={styles.attachmentImage}
                                    contentFit="cover"
                                />
                            ) : null}

                            {item.content && item.content !== 'Afbeelding verzonden' ? (
                                <Text style={[
                                    styles.messageText,
                                    isOwnMessage ? [styles.ownMessageText, { color: theme.colors.text.primary }] : [styles.otherMessageText, { color: theme.colors.text.primary }],
                                    item.attachment_type === 'image' && { marginTop: 8 }
                                ]}>{item.content}</Text>
                            ) : null}

                            {/* Reactions */}
                            {heartCount > 0 && (
                                <View style={styles.reactionBadge}>
                                    <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
                                    {heartCount > 1 && <Text style={styles.reactionCount}>{heartCount}</Text>}
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <DrawerToggleButton tintColor={theme.colors.onBackground} />
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Chat</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={[styles.chatContainer, { backgroundColor: theme.colors.background }]}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
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

            {typingUsers.length > 0 && (
                <View style={styles.typingIndicator}>
                    <Text style={[styles.typingText, { color: theme.colors.text.secondary }]}>
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'zijn'} aan het typen...
                    </Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
                style={{ backgroundColor: theme.colors.surface }}
            >
                <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={pickImage}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                        ) : (
                            <Paperclip size={24} color={theme.colors.text.secondary} />
                        )}
                    </TouchableOpacity>

                    <TextInput
                        style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text.primary }]}
                        value={message}
                        onChangeText={handleTextChange}
                        placeholder="Typ een bericht..."
                        placeholderTextColor={theme.colors.text.secondary}
                        returnKeyType="send"
                        onSubmitEditing={() => sendMessage(message)}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: theme.colors.primary }, (!message.trim() && !uploading) && [styles.sendButtonDisabled, { backgroundColor: theme.colors.background }]]}
                        onPress={() => sendMessage(message)}
                        disabled={!message.trim() || uploading}
                    >
                        <Send size={20} color={theme.colors.text.inverse} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <ImageViewerModal
                visible={!!viewingImage}
                imageUrl={viewingImage}
                onClose={() => setViewingImage(null)}
            />
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
        paddingHorizontal: 4, // Reduced to move avatars closer to edge
        paddingTop: 16,
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
        overflow: 'hidden', // Added to clip image corners
    },
    imageMessageContainer: {
        padding: 0, // Remove padding for images
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
        color: '#FFFFFF',
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
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 8,
        maxWidth: '80%',
    },
    ownMessageRow: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    otherMessageRow: {
        alignSelf: 'flex-start',
    },
    avatarContainer: {
        marginHorizontal: 8,
        marginBottom: 4,
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageContentWrapper: {
        flex: 1,
    },
    ownMessageContentWrapper: {
        alignItems: 'flex-end',
    },
    otherMessageContentWrapper: {
        alignItems: 'flex-start',
    },
    attachmentImage: {
        width: 240,
        height: 180,
    },
    reactionBadge: {
        position: 'absolute',
        bottom: -10,
        right: -5,
        backgroundColor: KribTheme.colors.secondary,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    reactionCount: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    sendButtonDisabled: {
        backgroundColor: KribTheme.colors.background, // or gray
        opacity: 0.5,
    },
    typingIndicator: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    typingText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontStyle: 'italic',
    },
});
