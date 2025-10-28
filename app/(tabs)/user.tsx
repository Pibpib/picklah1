// app/(tabs)/user.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  doc, getDoc, collection, query, where, getCountFromServer, Firestore,
} from 'firebase/firestore';

// RELATIVE imports (we're not using "@/")
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { auth, db } from '../../services/firebaseConfig'; // <- make sure these exist

type Counts = { activity: number; category: number; mood: number };
type ProfileDoc = {
  displayName?: string | null;
  dob?: string | null;
  photoURL?: string | null;
  favCategories?: string[]; // optional
  favMoods?: string[];      // optional
};

const initialCounts: Counts = { activity: 0, category: 0, mood: 0 };

export default function UserScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileDoc>({});
  const [plan, setPlan] = useState<'Premium' | 'Free' | string>('Free');
  const [counts, setCounts] = useState<Counts>(initialCounts);

  useEffect(() => {
    // subscribe to auth and then load data
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // 1) user_profile/{uid}
        const pSnap = await getDoc(doc(db, 'user_profile', u.uid));
        if (pSnap.exists()) setProfile(pSnap.data() as ProfileDoc);

        // 2) Subscription/{uid} (optional)
        try {
          const sSnap = await getDoc(doc(db, 'Subscription', u.uid));
          if (sSnap.exists()) {
            const data = sSnap.data() as any;
            setPlan((data?.plan || 'Free') as string);
          }
        } catch { /* ignore if collection absent */ }

        // 3) counts for Activity / Category / Mood
        const [activity, category, mood] = await Promise.all([
          smartCount(db, 'Activity', u.uid),
          smartCount(db, 'Category', u.uid),
          smartCount(db, 'Mood', u.uid),
        ]);
        setCounts({ activity, category, mood });
      } catch (e: any) {
        Alert.alert('Load failed', String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const name = profile.displayName ?? fbUser?.displayName ?? 'Your Name';
  const email = fbUser?.email ?? '—';
  const dob = profile.dob ?? '—';

  const onLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Logged out', 'You have been signed out.');
      // Optionally: router.replace('/auth/login')
    } catch (e: any) {
      Alert.alert('Logout failed', String(e?.message ?? e));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Settings</Text>

      <View style={[styles.card, styles.shadow]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Account</Text>

        {loading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Row label="Name" value={name} />
            <Row label="Date of Birth" value={dob} />
            <Row label="Email" value={email} right={<Ionicons name="chevron-forward" size={18} color="#97A0A6" />} />
            <Row label="Plan" value={String(plan)} last />
          </>
        )}
      </View>

      <View style={styles.row3}>
        <StatCard title="Activity" value={counts.activity} />
        <StatCard title="Category" value={counts.category} />
        <StatCard title="Mood" value={counts.mood} />
      </View>

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          styles.shadow,
          { opacity: pressed ? 0.85 : 1, borderColor: 'rgba(239,68,68,0.25)' },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Ionicons name="exit-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

/** Tries `ownerId == uid`, falls back to `uid == uid` (whichever exists). */
async function smartCount(db: Firestore, coll: string, uid: string): Promise<number> {
  // prefer ownerId
  try {
    const q1 = query(collection(db, coll), where('ownerId', '==', uid));
    const c1 = await getCountFromServer(q1);
    const n1 = Number(c1.data().count || 0);
    if (n1 > 0) return n1;
  } catch {/* no-op */}
  // fallback to field 'uid'
  try {
    const q2 = query(collection(db, coll), where('uid', '==', uid));
    const c2 = await getCountFromServer(q2);
    return Number(c2.data().count || 0);
  } catch {
    return 0;
  }
}

/* ---------- UI helpers ---------- */
function Row({
  label, value, right, last = false, onPress,
}: { label: string; value: string; right?: React.ReactNode; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !last && styles.rowDivider]}
      android_ripple={onPress ? { color: '#0000000f' } : undefined}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {right}
    </Pressable>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={[styles.statCard, styles.shadow]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

/* ------------------------------ styles ------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  header: { fontSize: 20, fontWeight: '700' },
  card: { borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E7EBEE' },
  cardTitle: { fontSize: 13, fontWeight: '700', opacity: 0.7, marginBottom: 6 },
  row: { paddingVertical: 10, paddingRight: 6, flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EEF2F4' },
  rowLabel: { fontSize: 12, fontWeight: '600', color: '#6B7883', marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  row3: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E7EBEE' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F59E0B' },
  statTitle: { fontSize: 12, fontWeight: '600', color: '#6B7883', marginTop: 2 },
  logoutBtn: { marginTop: 8, height: 44, borderRadius: 10, borderWidth: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#EF4444', fontWeight: '700' },
  shadow: Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 1.5 }, default: {} }),
});
