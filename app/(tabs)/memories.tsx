// app/(tabs)/memories.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Alert, Image, Modal, TextInput, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, orderBy, limit,
  getDocs, addDoc, serverTimestamp, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

import { useColorScheme } from '../../hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { auth, db, storage } from '../../services/firebaseConfig';

// ⬇️ Plan gating
import { usePlan } from '../../hooks/use-plan';
import PlanOverlay from '../../components/PlanOverlay';
import type { Plan } from '../../services/plan';

type MemoryDoc = {
  id: string;
  userID: string;
  imageURL: string;
  storagePath: string;
  note?: string;
  createdAt?: Timestamp;
};

const FREE_LIMIT = 3;

export default function MemoriesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];

  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<MemoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // upload UI
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // viewer UI
  const [viewer, setViewer] = useState<MemoryDoc | null>(null);

  // caption flow
  const [captionOpen, setCaptionOpen] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [pendingAsset, setPendingAsset] = useState<{ uri: string; fileName?: string; mimeType?: string } | null>(null);

  // ⬇️ Plan + overlay
  const { plan, ready: planReady, uid: planUid } = usePlan();
  const [planVisible, setPlanVisible] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  const fetchMemories = useCallback(async () => {
    if (!uid) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'Memories'),
        where('userID', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const data: MemoryDoc[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
      setItems(data);
    } catch (e: any) {
      if (e?.code === 'failed-precondition') {
        Alert.alert('Setting up', 'Creating Firestore index (userID + createdAt). Try again in ~1 minute.');
      } else {
        console.warn('fetchMemories error', e);
        Alert.alert('Error', 'Failed to load memories.');
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { fetchMemories(); }, [fetchMemories, uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMemories();
    setRefreshing(false);
  };

  // ImagePicker mediaTypes (SDK 54 compat)
  const pickerMediaTypes = (ImagePicker as any).MediaType
    ? [(ImagePicker as any).MediaType.Images]
    : (ImagePicker as any).MediaTypeOptions.Images;

  // Gate: Free users limited to 3
  const hitFreeCap = planReady && plan === 'Free' && items.length >= FREE_LIMIT;

  // Step 1: pick photo then open caption modal (or show plan overlay if hit cap)
  const onAddPhoto = async () => {
    if (!auth.currentUser) return Alert.alert('Sign in required', 'Please sign in first.');

    if (hitFreeCap) {
      setPlanVisible(true);
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Permission needed', 'Please allow photo library access.');

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: pickerMediaTypes,
        quality: 0.9,
        selectionLimit: 1,
      });
      if (res.canceled) return;

      const asset = res.assets[0];
      setPendingAsset({
        uri: asset.uri,
        fileName: (asset.fileName ?? undefined),
        mimeType: ((asset as any)?.mimeType ?? undefined),
      });
      setCaptionText('');
      setCaptionOpen(true);
    } catch (e: any) {
      console.warn('picker error', e);
      Alert.alert('Error', String(e?.message ?? e));
    }
  };

  // Step 2: upload with progress, then save Firestore (note is undefined if empty)
  const doUpload = async () => {
    if (!pendingAsset || !auth.currentUser) return;

    // Re-check cap right before upload (safety)
    if (plan === 'Free' && items.length >= FREE_LIMIT) {
      setCaptionOpen(false);
      setPlanVisible(true);
      return;
    }

    try {
      setCaptionOpen(false);
      setUploading(true);
      setProgress(0);

      const resp = await fetch(pendingAsset.uri);
      const blob: Blob = await resp.blob();

      const uidNow = auth.currentUser!.uid;
      const filename = `${Date.now()}_${pendingAsset.fileName ?? 'photo'}.jpg`;
      const storagePath = `memories/${uidNow}/${filename}`;
      const fileRef = ref(storage, storagePath);
      const metadata = { contentType: pendingAsset.mimeType || 'image/jpeg' };

      const task = uploadBytesResumable(fileRef, blob, metadata);
      task.on('state_changed', (snap) => {
        const pct = snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0;
        setProgress(pct);
      });

      await task;
      // @ts-ignore (RN Blob polyfill)
      if (typeof (blob as any).close === 'function') (blob as any).close();

      const imageURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'Memories'), {
        userID: uidNow,
        imageURL,
        storagePath,
        note: captionText.trim() || undefined,
        createdAt: serverTimestamp(),
      });

      setPendingAsset(null);
      setCaptionText('');
      await fetchMemories();
      Alert.alert('Saved', 'Photo added to your album.');
    } catch (e: any) {
      const code = e?.code ?? 'unknown';
      const server = e?.customData?.serverResponse ?? '';
      console.log('[upload error]', code, e?.message, server);
      Alert.alert('Upload failed', `${code}\n${e?.message ?? e}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onDelete = (item: MemoryDoc) => {
    Alert.alert('Delete photo', 'Remove this photo from your album?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.storagePath) {
              const fileRef = ref(storage, item.storagePath);
              await deleteObject(fileRef).catch(() => {});
            }
            await deleteDoc(doc(db, 'Memories', item.id));
            await fetchMemories();
          } catch (e) {
            console.warn('delete error', e);
            Alert.alert('Delete failed', 'Could not delete this memory.');
          }
        }
      }
    ]);
  };

  const formatDate = (ts?: Timestamp) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: MemoryDoc }) => (
    <Pressable
      onPress={() => setViewer(item)}
      onLongPress={() => onDelete(item)}
      style={[styles.card, styles.cardShadow]}
    >
      <Image source={{ uri: item.imageURL }} style={styles.image} resizeMode="cover" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{formatDate(item.createdAt)}</Text>
      </View>
      {!!item.note && (
        <View style={styles.captionBar}>
          <Text style={styles.captionText} numberOfLines={1}>{item.note}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Memories</Text>
      </View>

      {/* Upload progress */}
      {uploading && (
        <View style={styles.progressBox}>
          <ActivityIndicator size="small" />
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}

      {/* Grid */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyCircle}><Ionicons name="images-outline" size={34} color="#9CA3AF" /></View>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySub}>
            {plan === 'Free'
              ? `Free plan: you can add up to ${FREE_LIMIT}.`
              : 'Tap + to add your first photo'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={onAddPhoto}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Add photo"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Fullscreen viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerClose} onPress={() => setViewer(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {viewer && (
            <View style={styles.viewerBody}>
              <Image source={{ uri: viewer.imageURL }} style={styles.viewerImage} resizeMode="contain" />
              {!!viewer.note && <Text style={styles.viewerCaption}>{viewer.note}</Text>}
            </View>
          )}
        </View>
      </Modal>

      {/* Caption modal */}
      <Modal visible={captionOpen} transparent animationType="slide" onRequestClose={() => setCaptionOpen(false)}>
        <View style={styles.captionBackdrop}>
          <View style={styles.captionCard}>
            <Text style={styles.captionTitle}>Add a caption (optional)</Text>
            <TextInput
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="Where were you? Who with?"
              placeholderTextColor="#9CA3AF"
              style={styles.captionInput}
              maxLength={120}
              autoFocus
            />
            <View style={styles.captionRow}>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={() => { setCaptionOpen(false); setPendingAsset(null); }}
              >
                <Text style={[styles.btnText, { color: '#374151' }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={doUpload}>
                <Text style={styles.btnText}>Upload</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Plan overlay (modal) */}
      <PlanOverlay
        visible={planVisible}
        uid={planUid ?? uid}
        currentPlan={(plan as Plan)}
        onClose={() => setPlanVisible(false)}
        onChanged={() => fetchMemories()}
      />
    </View>
  );
}

const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 22, fontWeight: '800' },

  // Empty state
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontWeight: '800', color: '#374151', fontSize: 18 },
  emptySub: { color: '#6B7280', fontSize: 12 },

  // Progress
  progressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8,
  },
  progressTrack: { flex: 1, height: 8, backgroundColor: '#FDEAD7', borderRadius: 999 },
  progressFill: { height: 8, backgroundColor: '#F59E0B', borderRadius: 999 },
  progressText: { fontWeight: '700', color: '#9A3412', minWidth: 40, textAlign: 'right' },

  // Cards
  card: {
    flex: 1,
    backgroundColor: '#FBE3BF',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: '#D8C5A8',
    overflow: 'hidden',
    minHeight: 180,
  },
  cardShadow: {
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  image: { width: '100%', height: 200 },

  badge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  captionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 6,
  },
  captionText: { color: '#fff', fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#F59E0B', width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // Viewer modal
  viewerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', paddingTop: Platform.OS === 'ios' ? 52 : 28,
  },
  viewerClose: { position: 'absolute', top: Platform.OS === 'ios' ? 40 : 16, right: 16, zIndex: 2, padding: 8 },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  viewerImage: { width: '100%', height: '75%' },
  viewerCaption: { color: '#E5E7EB', marginTop: 12, textAlign: 'center' },

  // Caption modal
  captionBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'flex-end'
  },
  captionCard: {
    width: '100%', backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  captionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111827' },
  captionInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: '#111827', marginBottom: 12,
  },
  captionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnGhost: { backgroundColor: '#F3F4F6' },
  btnPrimary: { backgroundColor: '#F59E0B' },
  btnText: { color: '#fff', fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
