// app/(tabs)/memories.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {View,Text,StyleSheet,FlatList,Pressable,ActivityIndicator,RefreshControl,Alert,Image,} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import {collection,query,where,orderBy,limit,getDocs,addDoc,serverTimestamp,Timestamp,} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// RELATIVE imports (since we're skipping "@/")
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { auth, db, storage } from '../../services/firebaseConfig';

type Memory = {
  id: string;
  userID: string;
  imageURL: string;
  note?: string;
  createdAt?: Timestamp;
};

export default function MemoriesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];

  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  // fetch user's photos
  const fetchMemories = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'Memories'),
        where('userID', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const data: Memory[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
      setItems(data);
    } catch (e) {
      console.warn('fetchMemories error', e);
      Alert.alert('Error', 'Failed to load memories.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories, uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMemories();
    setRefreshing(false);
  };

  // pick a photo, upload to Storage, save Firestore doc
  const onAddPhoto = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign in required', 'Please sign in first.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,       // upload as base64 (simpler on Android/Expo Go)
        quality: 0.9,
      });
      if (res.canceled) return;

      const asset = res.assets[0];
      if (!asset.base64) {
        Alert.alert('Upload failed', 'Could not read image data.');
        return;
      }

      setUploading(true);
      const uidNow = auth.currentUser!.uid;
      const filename = `memories/${uidNow}/${Date.now()}_${asset.fileName ?? 'photo'}.jpg`;
      const sref = ref(storage, filename);

      // upload base64 string
      await uploadString(sref, asset.base64, 'base64', { contentType: 'image/jpeg' });
      const imageURL = await getDownloadURL(sref);

      // write Firestore doc
      await addDoc(collection(db, 'Memories'), {
        userID: uidNow,
        imageURL,
        createdAt: serverTimestamp(),
      });

      await fetchMemories();
      Alert.alert('Saved', 'Photo added to your album.');
    } catch (e: any) {
      console.error('Upload error:', e?.code, e?.message);
      Alert.alert('Upload failed', String(e?.message ?? e));
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: Memory }) => (
    <View style={[styles.card, styles.cardShadow]}>
      <Image source={{ uri: item.imageURL }} style={styles.image} resizeMode="cover" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Memory</Text>
        <Pressable
          onPress={onAddPhoto}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6 }]}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
        >
          <Ionicons name="add" size={22} color="#F59E0B" />
        </Pressable>
      </View>

      {/* Uploading banner */}
      {uploading && (
        <View style={styles.uploadBar}>
          <ActivityIndicator size="small" />
          <Text style={styles.uploadText}>Uploading…</Text>
        </View>
      )}

      {/* Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontWeight: '700', color: '#374151' }}>No photos yet</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>Tap + to add your first memory</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 20, fontWeight: '700' },

  uploadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  uploadText: { color: '#9A3412', fontWeight: '600' },

  card: {
    flex: 1,
    backgroundColor: '#FBE3BF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8C5A8',
    overflow: 'hidden',
    minHeight: 140,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1.5,
  },
  image: { width: '100%', height: 170 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
