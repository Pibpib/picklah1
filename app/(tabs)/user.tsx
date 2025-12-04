import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {doc,getDoc,collection,query,where,getCountFromServer,Firestore,Timestamp,getDocs,limit,} from 'firebase/firestore';

import { useColorScheme } from '../../hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { auth, db } from '../../services/firebaseConfig';
import { router } from 'expo-router';
import { usePremium } from "@/services/userService";

import { usePlan } from '../../hooks/usePlan';
import PlanOverlay from '../../components/PlanOverlay';
import type { Plan } from '../../services/plan';


type Counts = { activity: number; category: number; mood: number };

type ProfileDoc = {
  displayName?: string | null;
  dob?: string | Timestamp | null;
  photoURL?: string | null;
  favCategories?: string[];
  favMoods?: string[];
  userID?: string; 
};

const initialCounts: Counts = { activity: 0, category: 0, mood: 0 };

const formatTimestamp = (ts?: string | Timestamp | null) => {
  if (!ts) return '—';
  if (ts instanceof Timestamp) return ts.toDate().toLocaleDateString();
  return ts;
};

export default function UserScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileDoc>({});
  const [counts, setCounts] = useState<Counts>(initialCounts);

  // Live plan from Subscription
// Use fbUser?.uid as a dependency for usePlan
const { plan, ready: planReady, uid: planUid } = usePlan(fbUser?.uid);
  const [planVisible, setPlanVisible] = useState(false);

  // Log every time plan updates
  useEffect(() => {
    console.log("[UserScreen] usePlan update:", {
      plan,
      planReady,
      planUid,
      fbUserUid: fbUser?.uid ?? null
    });
  }, [plan, planReady, planUid, fbUser]);

  // Auth state change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log("[UserScreen] Auth state changed:", u?.uid ?? "null");
      setFbUser(u);

      if (!u) {
        console.log("[UserScreen] No user signed in. Resetting profile and counts.");
        setProfile({});
        setCounts(initialCounts);
        setLoading(false);
        return;
      }

      try {
        console.log("[UserScreen] Loading profile and counts for UID:", u.uid);
        setLoading(true);

        // Fetch profile
        const qProfile = query(collection(db, 'user_profile'), where('userID', '==', u.uid), limit(1));
        const qSnap = await getDocs(qProfile);
        if (!qSnap.empty) {
          const data = qSnap.docs[0].data() as ProfileDoc;
          console.log("[UserScreen] Profile fetched from query:", data);
          setProfile(data);
        } else {
          const pSnap = await getDoc(doc(db, 'user_profile', u.uid));
          if (pSnap.exists()) {
            const data = pSnap.data() as ProfileDoc;
            console.log("[UserScreen] Profile fetched from doc fallback:", data);
            setProfile(data);
          } else {
            console.log("[UserScreen] No profile found. Using empty.");
            setProfile({});
          }
        }

        // Fetch counts
        const [activity, category, mood] = await Promise.all([
          smartCount(db, 'Activity', u.uid),
          smartCount(db, 'Category', u.uid),
          smartCount(db, 'Mood', u.uid),
        ]);
        console.log("[UserScreen] Counts fetched:", { activity, category, mood });
        setCounts({ activity, category, mood });
      } catch (e: any) {
        console.error("[UserScreen] Load failed:", e);
        Alert.alert('Load failed', String(e?.message ?? e));
      } finally {
        setLoading(false);
        console.log("[UserScreen] Loading finished.");
      }
    });
    return unsub;
  }, []);

  const signedIn = !!fbUser;
  const name = signedIn ? (profile.displayName ?? fbUser?.displayName ?? '—') : '—';
  const email = signedIn ? (fbUser?.email ?? '—') : '—';
  const dob = signedIn ? formatTimestamp(profile.dob) : '—';

  async function onLogout() {
    try {
      console.log("[UserScreen] Logging out...");
      await signOut(auth);
      router.replace('/auth/login');
    } catch (e) {
      console.warn('[UserScreen] logout error', e);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
      </View>

      {signedIn && (
        <View style={[styles.card, styles.shadow, { backgroundColor: theme.border }]}>
          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Row label="Name" value={name} theme={theme} />
              <Row label="Date of Birth" value={dob} theme={theme} />
              <Row
                label="Email"
                value={email}
                right={<Ionicons name="chevron-forward" size={18} color="#97A0A6" />}
                theme={theme}
              />
              <Row
                label="Plan"
                value={planReady ? plan : "Loading..."}
                last
                onPress={() => setPlanVisible(true)}
                theme={theme}
              />
              {console.log("[UserScreen] Profile card rendered with plan:", plan)}
            </>
          )}
        </View>
      )}

      {signedIn && (
        <View style={styles.row3}>
          <StatCard title="Activity" value={counts.activity} theme={theme} />
          <StatCard title="Category" value={counts.category} theme={theme} />
          <StatCard title="Mood" value={counts.mood} theme={theme} />
        </View>
      )}

      {signedIn ? (
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            styles.shadow,
            { opacity: pressed ? 0.85 : 1, borderColor: 'rgba(239,68,68,0.25)' },
          ]}
        >
          <Ionicons name="exit-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      ) : (
        !loading && (
          <Text style={{ color: theme.text, opacity: 0.7 }}>
            Please log in or sign up to view account settings.
          </Text>
        )
      )}

      <PlanOverlay
        visible={planVisible}
        uid={planUid ?? null}
        currentPlan={(plan as Plan)}
        onClose={() => setPlanVisible(false)}
        onChanged={() => console.log("[UserScreen] PlanOverlay onChanged")}
      />
    </View>
  );
}

/** Count documents for a user by `createdBy` */
async function smartCount(db: Firestore, coll: string, uid: string): Promise<number> {
  try {
    const q = query(collection(db, coll), where('createdBy', '==', uid));
    const c = await getCountFromServer(q);
    return Number(c.data().count || 0);
  } catch (e) {
    console.error('Error counting', coll, e);
    return 0;
  }
}


function Row({
  label, value, right, last = false, onPress, theme,
}: { label: string; value: string; right?: React.ReactNode; last?: boolean; onPress?: () => void; theme: typeof Colors['light'] }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !last && styles.rowDivider]}
      android_ripple={onPress ? { color: '#0000000f' } : undefined}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
      </View>
      {right}
    </Pressable>
  );
}

function StatCard({ title, value, theme }: { title: string; value: number; theme: typeof Colors['light'] }) {
  return (
    <View style={[styles.statCard, styles.shadow, { backgroundColor: theme.border }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1,paddingHorizontal: 16,paddingTop: 80, },
  header: {flexDirection: "row",justifyContent: "space-between",alignItems: "center",width: "100%",position: "absolute",top: 40,zIndex: 10,paddingHorizontal: 20,},
  title: {fontSize: 22,fontWeight: "bold",},

  card: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E7EBEE', marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', opacity: 0.7, marginBottom: 6 },
  row: { paddingVertical: 10, paddingRight: 6, flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EEF2F4' },
  rowLabel: { fontSize: 12, marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: 'bold'},
  row3: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E7EBEE' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F59E0B' },
  statTitle: { fontSize: 12, fontWeight: '600', color: '#6B7883', marginTop: 2 },
  logoutBtn: { marginTop: 16, height: 44, borderRadius: 10, borderWidth: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#EF4444', fontWeight: '700' },
  shadow: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 1.5 },
    default: {},
  }),
});
