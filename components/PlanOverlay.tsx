// components/PlanOverlay.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setUserPlan, Plan } from '../services/plan';

type Props = {
  visible: boolean;
  uid: string | null;
  currentPlan: Plan;
  onClose: () => void;
  onChanged?: (plan: Plan) => void;
};

export default function PlanOverlay({ visible, uid, currentPlan, onClose, onChanged }: Props) {
  const [saving, setSaving] = useState<Plan | null>(null);

  const choose = async (p: Plan) => {
    if (!uid) return;
    try {
      setSaving(p);
      await setUserPlan(uid, p, 'manual');
      onChanged?.(p);
    } finally {
      setSaving(null);
      onClose();
    }
  };

  const Card = ({ title, desc, value }: { title: string; desc: string; value: Plan }) => {
    const active = currentPlan === value;
    const loading = saving === value;
    return (
      <Pressable
        onPress={() => choose(value)}
        disabled={loading}
        style={({ pressed }) => [
          styles.card, active && styles.cardActive, pressed && { opacity: 0.95 }
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons
            name={active ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={active ? '#16A34A' : '#94A3B8'}
          />
          <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>{title}</Text>
        </View>
        <Text style={styles.cardDesc}>{desc}</Text>
        {loading ? <ActivityIndicator /> : active && <Text style={styles.badge}>Current</Text>}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.header}>Pick a Plan</Text>
          <Text style={styles.sub}>
            Free users can upload <Text style={{fontWeight:'800'}}>3</Text> memories. Go Premium for unlimited.
          </Text>

          <Card title="Free" value="Free" desc="Basic features. Up to 3 memories." />
          <Card title="Premium" value="Premium" desc="Unlimited memories, advanced features." />

          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 10 },
  header: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sub: { color: '#6B7280', marginBottom: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 6 },
  cardActive: { borderColor: '#16A34A66', backgroundColor: '#F0FDF4' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardTitleActive: { color: '#166534' },
  cardDesc: { color: '#6B7280' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#DCFCE7', color: '#166534', fontWeight: '700' },
  closeBtn: { marginTop: 4, backgroundColor: '#F59E0B', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontWeight: '800' },
});
