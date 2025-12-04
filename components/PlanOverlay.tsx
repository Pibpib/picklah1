// components/PlanOverlay.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import { setUserPlan, Plan } from "../services/plan";

type Props = {
  visible: boolean;
  uid: string | null;
  currentPlan: Plan;
  onClose: () => void;
  onChanged?: (plan: Plan) => void;
};

export default function PlanOverlay({
  visible,
  uid,
  currentPlan,
  onClose,
  onChanged,
}: Props) {
  const [saving, setSaving] = useState<Plan | null>(null);
  const [offerings, setOfferings] = useState<any>(null);

  // Load RevenueCat offerings when modal opens
  useEffect(() => {
    if (visible) loadOfferings();
  }, [visible]);

  const loadOfferings = async () => {
    try {
      const o = await Purchases.getOfferings();
      setOfferings(o);
    } catch (e) {
      console.log("Error loading offerings:", e);
    }
  };

  // FREE plan selection
  const chooseFree = async () => {
    if (!uid) return;
    try {
      setSaving("Free");
      await setUserPlan(uid, "Free", "manual");
      onChanged?.("Free");
    } finally {
      setSaving(null);
      onClose();
    }
  };

  // PREMIUM purchase flow
  const buyPremium = async () => {
    if (!uid) return;

    try {
      if (!offerings?.current || offerings.current.availablePackages.length === 0) {
        Alert.alert("No purchase packages available");
        return;
      }

      setSaving("Premium");

      const pkg = offerings.current.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Small delay to ensure entitlements are updated
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedCustomerInfo = await Purchases.getCustomerInfo();
      const entitlement = updatedCustomerInfo.entitlements.active["Premium"];
      const hasPremium = !!entitlement;

      if (hasPremium) {
        await setUserPlan(uid, "Premium", "iap");
        onChanged?.("Premium");
        console.log("Purchase successful, upgraded to Premium");
        Alert.alert("Success", "You are now a Premium user!");
      } else {
        console.log("Purchase completed but entitlement not active yet");
        Alert.alert("Success", "Purchase completed. Premium will activate shortly.");
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.log("Purchase error:", e);
        Alert.alert("Error", "Payment failed. Try again.");
      }
    } finally {
      setSaving(null);
      onClose();
    }
  };

  // Card Component
  const Card = ({
    title,
    desc,
    value,
    onPress,
  }: {
    title: string;
    desc: string;
    value: Plan;
    onPress?: () => void;
  }) => {
    const active = currentPlan === value;
    const loading = saving === value;

    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.card,
          active && styles.cardActive,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons
            name={active ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={active ? "#16A34A" : "#94A3B8"}
          />
          <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>
            {title}
          </Text>
        </View>

        <Text style={styles.cardDesc}>{desc}</Text>

        {loading ? (
          <ActivityIndicator />
        ) : (
          active && <Text style={styles.badge}>Current</Text>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.header}>Pick a Plan</Text>
          <Text style={styles.sub}>
            Free users can upload <Text style={{ fontWeight: "800" }}>3</Text> memories. Go Premium
            for unlimited.
          </Text>

          {/* FREE PLAN */}
          <Card
            title="Free"
            value="Free"
            desc="Basic features. Up to 3 memories."
            onPress={chooseFree}
          />

          {/* PREMIUM PLAN */}
          <Card
            title="Premium"
            value="Premium"
            desc="Unlimited memories, advanced features."
            onPress={buyPremium}
          />

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 10,
  },
  header: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  sub: { color: "#6B7280", marginBottom: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 6,
  },
  cardActive: {
    borderColor: "#16A34A66",
    backgroundColor: "#F0FDF4",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardTitleActive: { color: "#166534" },
  cardDesc: { color: "#6B7280" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    color: "#166534",
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 4,
    backgroundColor: "#F59E0B",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontWeight: "800" },
});
