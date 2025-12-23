import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, ExternalLink, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { KribTheme } from '../../../theme/theme';

export default function HallOfFame() {
    const router = useRouter();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeLink, setNewRecipeLink] = useState('');
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);

    useEffect(() => {
        fetchHousehold();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchRecipes();
        }
    }, [householdId]);

    async function fetchHousehold() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: members, error } = await supabase
                .from('household_members')
                .select('household_id')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                console.error('Error fetching member:', error);
                setLoading(false);
                return;
            }

            if (members && members.length > 0) {
                setHouseholdId(members[0].household_id);
            } else {
                setLoading(false);
            }
        } catch (e) {
            console.error('Exception in fetchHousehold:', e);
            setLoading(false);
        }
    }

    async function fetchRecipes() {
        if (!householdId) {
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('grocery_favorites')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: false });

        if (data) {
            setRecipes(data);
        }
        setLoading(false);
    }

    async function addRecipe() {
        if (!householdId) {
            Alert.alert('Error', 'Geen huishouden gevonden. Probeer opnieuw te laden.');
            return;
        }
        if (!newRecipeName.trim()) return;

        // CHECK LIMIT: Max 15 recipes
        if (recipes.length >= 15) {
            Alert.alert('Limiet bereikt', 'Je hebt het maximumaantal van 15 favorieten bereikt.');
            return;
        }

        const name = newRecipeName.trim();
        const link = newRecipeLink.trim() || null;

        setNewRecipeName('');
        setNewRecipeLink('');

        const { data, error } = await supabase
            .from('grocery_favorites')
            .insert([
                {
                    household_id: householdId,
                    name: name,
                    link_url: link,
                }
            ])
            .select()
            .single();

        if (error) {
            Alert.alert('Error', 'Kon recept niet toevoegen.');
        } else if (data) {
            setRecipes(prev => [data, ...prev]);
        }
    }

    async function deleteRecipe(id: string) {
        const { error } = await supabase
            .from('grocery_favorites')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
        } else {
            setRecipes(prev => prev.filter(r => r.id !== id));
        }
    }

    async function addToList(item: any) {
        if (!householdId) return;

        // Fetch current max position
        const { data: currentItems } = await supabase
            .from('shopping_items')
            .select('position')
            .eq('household_id', householdId);

        const maxPos = currentItems && currentItems.length > 0
            ? Math.max(...currentItems.map(i => i.position || 0))
            : 0;

        const { error } = await supabase
            .from('shopping_items')
            .insert([
                {
                    household_id: householdId,
                    name: item.name,
                    added_by_user_id: (await supabase.auth.getUser()).data.user?.id,
                    is_checked: false,
                    is_pinned: false,
                    position: maxPos + 1
                }
            ]);

        if (!error) {
            Alert.alert('Gelukt', `"${item.name}" toegevoegd aan boodschappenlijst.`);
        } else {
            Alert.alert('Error', 'Kon item niet toevoegen.');
        }
    }

    function openLink(url: string) {
        if (url) {
            Linking.openURL(url).catch(err => Alert.alert('Error', 'Kan link niet openen'));
        }
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemContainer}>
            <View style={styles.textContainer}>
                <Text style={styles.itemText}>{item.name}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => addToList(item)} style={styles.actionButton}>
                    <Plus size={20} color={KribTheme.colors.success} />
                </TouchableOpacity>
                {item.link_url && (
                    <TouchableOpacity onPress={() => openLink(item.link_url)} style={styles.actionButton}>
                        <ExternalLink size={20} color={KribTheme.colors.primary} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => deleteRecipe(item.id)} style={styles.actionButton}>
                    <Trash2 size={20} color={KribTheme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hall of Fame 🏆</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={styles.addItemContainer}>
                    <View style={styles.inputs}>
                        <TextInput
                            style={styles.input}
                            value={newRecipeName}
                            onChangeText={setNewRecipeName}
                            placeholder="Gerecht naam..."
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            returnKeyType="next"
                        />
                        <TextInput
                            style={[styles.input, { marginTop: 8 }]}
                            value={newRecipeLink}
                            onChangeText={setNewRecipeLink}
                            placeholder="Link (optioneel)..."
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            autoCapitalize="none"
                            returnKeyType="done"
                            onSubmitEditing={addRecipe}
                        />
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={addRecipe}>
                        <Plus size={24} color={KribTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={recipes}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyList}>
                                <Text style={styles.emptyListText}>Nog geen favorieten.</Text>
                            </View>
                        }
                    />
                )}
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
    backButton: {
        padding: 4,
    },
    addItemContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: KribTheme.colors.background,
        marginBottom: 8,
        alignItems: 'center',
    },
    inputs: {
        flex: 1,
        marginRight: 12,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: KribTheme.borderRadius.m,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    addButton: {
        backgroundColor: '#FFFFFF',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 8,
        ...KribTheme.shadows.card,
    },
    textContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
        fontWeight: '500',
        color: KribTheme.colors.text.primary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    actionButton: {
        padding: 4,
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyListText: {
        color: '#FFFFFF',
        fontStyle: 'italic',
    },
});
