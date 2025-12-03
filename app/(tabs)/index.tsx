import { useRouter, useFocusEffect} from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import { Colors } from "../../constants/theme";
import { Activity, Category, fetchActivitiesFiltered, fetchCategories, fetchMoods, Mood, } from "../../services/activityService";
import { auth } from "../../services/firebaseConfig";
import star1 from "../../assets/images/star1.png";
import star2 from "../../assets/images/star2.png";
import {
  getUserProfile,
  listenUserSubscriptionByUserId,
} from "../../services/userService";

import spinBtn from "../../assets/images/spinBtn.png";
import spinBtnPressed from "../../assets/images/spin-pressed.png";
import AdGate from "../../components/AdGate";

// gating config
const SPINS_PER_NOTICE = 3;   // free users see an ad every 3 spins
const AD_SECONDS = 15;

export default function SpinScreen() {
  const router = useRouter();
  const spinAnim = useRef(new Animated.Value(0)).current;

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<"free" | "premium">("free");

  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const [customAlertVisible, setCustomAlertVisible] = useState(false);

  // gating state
  const [spinsSinceNotice, setSpinsSinceNotice] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [pendingSpin, setPendingSpin] = useState(false);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // 1) Auth + profile + LIVE plan listener (by userID field)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setUserPlan("free");
        router.replace("/auth/login");
        return;
      }

      setUser(currentUser);

      // profile (one-off)
      const p = await getUserProfile(currentUser.uid);
      setProfile(p ?? null);

      // live plan updates (query where userID == uid)
      const unsubPlan = listenUserSubscriptionByUserId(
        currentUser.uid,
        (sub) => {
          const plan = (sub?.planType as "free" | "premium") ?? "free";
          setUserPlan(plan);
        }
      );

      // cleanup plan listener if auth user changes
      return () => unsubPlan();
    });

    return () => unsubAuth();
  }, []);


  // Fetch categories & moods depending on user plan
  useFocusEffect(
    useCallback(() => {
      const loadFiltersAndActivities = async () => {
        // Fetch categories & moods
        const catData = await fetchCategories();
        const moodData = await fetchMoods();

        let filteredCats = catData;
        let filteredMoods = moodData;

        if (userPlan === "free") {
          filteredCats = catData.filter((c) => c.accessLevel === "free");
          filteredMoods = moodData.filter((m) => m.accessLevel === "free");
        }

        setCategories(filteredCats);
        setMoods(filteredMoods);

        setSelectedCategories(filteredCats.map((c) => c.id));
        setSelectedMoods(filteredMoods.map((m) => m.id));

        // Fetch activities
        const allActivities = await fetchActivitiesFiltered(
          filteredCats.map((c) => c.id),
          filteredMoods.map((m) => m.id)
        );

        let filtered = allActivities;

        if (userPlan === "free") {
          filtered = allActivities.filter((a) => {
            const category = filteredCats.find((c) => c.id === a.categoryId);
            const moodAccess = a.moodIds.map(
              (mid) => filteredMoods.find((m) => m.id === mid)?.accessLevel
            );

            const allMoodsFree = moodAccess.every((lvl) => lvl === "free");
            const isCategoryFree = category?.accessLevel === "free";
            const isSystemActivity = a.createdBy === "system";

            return isSystemActivity && isCategoryFree && allMoodsFree;
          });
        } else {
          filtered = allActivities.filter(
            (a) => a.createdBy === "system" || a.createdBy === user?.uid
          );
        }

        setActivities(filtered);
      };

      loadFiltersAndActivities();
    }, [userPlan, user])
  );

  // 3) Activities filtered by selections + plan
  useEffect(() => {
    const loadActivities = async () => {
      const all = await fetchActivitiesFiltered(selectedCategories, selectedMoods);
      let filtered = all;

      if (userPlan === "free") {
        filtered = all.filter((a) => {
          const category = categories.find((c) => c.id === a.categoryId);
          const moodAccess = a.moodIds.map(mid => moods.find(m => m.id === mid)?.accessLevel);
          const allMoodsFree = moodAccess.every(l => l === "free");
          const isCategoryFree = category?.accessLevel === "free";
          const isSystemActivity = a.createdBy === "system";
          return isSystemActivity && isCategoryFree && allMoodsFree;
        });
      } else {
        filtered = all.filter(a => a.createdBy === "system" || a.createdBy === user?.uid);
      }

      setActivities(filtered);
    };

    if (categories.length && moods.length) loadActivities();
  }, [selectedCategories, selectedMoods, userPlan, categories, moods, user]);

  // toggles
  const toggleCategory = (id: string) =>
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const toggleMood = (id: string) =>
    setSelectedMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.categoryName || "Unknown";

  const getMoodNames = (moodIds: string[]) =>
    moods.filter(m => moodIds.includes(m.id)).map(m => m.moodName);

  // spin animation
  const spinWheel = () => {
    if (spinning || activities.length === 0) return;
    setSpinning(true);

    const idx = Math.floor(Math.random() * activities.length);
    const turns = 5;
    const angle = 360 / activities.length;
    const endDeg = 360 * turns + (360 - idx * angle) - angle / 2;

    Animated.timing(spinAnim, {
      toValue: endDeg,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setResult(activities[idx].activityTitle);
      spinAnim.setValue(endDeg % 360);

      const chosen = activities[idx];
      setSelectedActivity(chosen);
      setCustomAlertVisible(true);
    });
  };

  // gated spin press
  const onSpinPress = () => {
    if (!user) {
      Alert.alert("Sign in required", "Please log in to spin the wheel.");
      router.replace("/auth/login");
      return;
    }

    if (userPlan === "premium") {
      spinWheel();
      return;
    }

    const next = spinsSinceNotice + 1;
    if (next >= SPINS_PER_NOTICE) {
      setPendingSpin(true);
      setShowAd(true);
    } else {
      setSpinsSinceNotice(next);
      spinWheel();
    }
  };

  const onAdComplete = () => {
    setShowAd(false);
    if (pendingSpin) {
      setPendingSpin(false);
      setSpinsSinceNotice(0);
      spinWheel();
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const radius = 140;
  const anglePerSlice = (2 * Math.PI) / (activities.length || 1);
  const createPath = (i: number) => {
    const startAngle = i * anglePerSlice - Math.PI / 2;
    const endAngle = startAngle + anglePerSlice;
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    return `
      M${radius},${radius}
      L${x1},${y1}
      A${radius},${radius} 0 0,1 ${x2},${y2}
      Z
    `;
  };

  const displayActivities =
    activities.length > 0
      ? activities
      : [{
          id: "none",
          activityTitle: "No activity",
          categoryId: "",
          moodIds: [],
          emoji: "",
          createdBy: "system",
          description: "",
        }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Spin</Text>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
          <Ionicons name="filter" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {/* Headline */}
      <View style={{ alignItems: "center", marginTop: 100, marginBottom: 80 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", textAlign: "center" }}>
          ✨{"\n"}
          <Text style={{ color: theme.text }}>No More{"\n"}</Text>
          <Text style={{ color: theme.main }}>Decision Fatigue</Text>
        </Text>

        <Text style={{ color: theme.text, fontSize: 14, opacity: 0.8, marginTop: 8, textAlign: "center" }}>
          Let Your Destiny Choose Your Activity
        </Text>
      </View>

      {/* Filters */}
      {showFilter && (
        <View style={[styles.filterMenu, { backgroundColor: theme.filterDefault, borderColor: theme.borderbold, borderWidth: 1 }]}>
          <Text style={{ color: theme.text, marginBottom: 4, fontSize: 14 }}>Category</Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterItem,
                    {
                      backgroundColor: isSelected ? theme.main : theme.filterDefault,
                      borderColor: isSelected ? theme.main : theme.borderbold,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: isSelected ? "bold" : "normal" }}>
                    {cat.categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={{ color: theme.text, marginBottom: 4, fontSize: 14 }}>Mood</Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {moods.map((mood) => {
              const isSelected = selectedMoods.includes(mood.id);
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.filterItem,
                    {
                      backgroundColor: isSelected ? theme.main : theme.filterDefault,
                      borderColor: isSelected ? theme.main : theme.borderbold,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => toggleMood(mood.id)}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: isSelected ? "bold" : "normal" }}>
                    {mood.moodName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Wheel with golden ring */}
      <View
        style={{
          marginBottom: 30,
          alignItems: "center",
          justifyContent: "center",
          width: radius * 2 + 20,
          height: radius * 2 + 20,
          borderRadius: (radius * 2 + 20) / 2,
          backgroundColor: theme.main,
          borderWidth: 2,
          borderColor: "#BC810F",
        }}
      >
        <Svg width={radius * 2 + 10} height={radius * 2 + 10} style={{ position: "absolute" }}>
          <Path
            d={`
              M${radius + 5},${radius + 5}
              m-${radius},0
              a${radius},${radius} 0 1,0 ${radius * 2},0
              a${radius},${radius} 0 1,0 -${radius * 2},0
            `}
            fill="none"
            stroke="#BC810F"
            strokeWidth={4}
          />
        </Svg>

        <Animated.View style={{ transform: [{ rotate: spinAnim.interpolate({inputRange:[0,360],outputRange:["0deg","360deg"]}) }] }}>
          <Svg width={radius * 2} height={radius * 2}>
            <G>
              {displayActivities.map((activity, i) => {
                const mid = (i + 0.5) * anglePerSlice - Math.PI / 2;
                const textR = radius * 0.8;
                const x = radius + textR * Math.cos(mid);
                const y = radius + textR * Math.sin(mid);
                const rotation = (mid * 180) / Math.PI;

                return (
                  <React.Fragment key={activity.id}>
                    <Path d={createPath(i)} fill={i % 2 === 0 ? theme.background : theme.mainlight} />
                    <SvgText
                      x={x}
                      y={y}
                      fill={theme.text}
                      fontWeight="bold"
                      fontSize={16}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${rotation}, ${x}, ${y})`}
                    >
                      {activity.emoji ? activity.emoji + " " : ""}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </G>
          </Svg>
        </Animated.View>
        {/* Star Image overlay */}
        <Image
          source={star1} // or star2
          style={{
            position: "absolute",
            bottom: -5, // adjust to position above center
            left: 0, // adjust to center horizontally
            width: 80,
            height: 80,
            zIndex: 5,
          }}
          resizeMode="contain"
        />
        <Image
          source={star2} // or star2
          style={{
            position: "absolute",
            top: 18, // adjust to position above center
            right: 20, // adjust to center horizontally
            width: 50,
            height: 50,
            zIndex: 5,
          }}
          resizeMode="contain"
        />

        {/* Spin Button */}
        <TouchableOpacity
          onPress={onSpinPress}
          disabled={spinning || activities.length === 0}
          activeOpacity={1}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -50,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image source={spinning ? spinBtnPressed : spinBtn} style={{ width: 80, height: 80 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.text, fontSize: 14 }}>{activities.length} activities available</Text>

      {/* Result modal */}
      {customAlertVisible && selectedActivity && (
        <View style={[styles.alertOverlay]}>
          <View style={[styles.alertBox, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              onPress={() => setCustomAlertVisible(false)}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 10, backgroundColor: theme.border, paddingHorizontal: 8, borderRadius: 12 }}
            >
              <Text style={{ fontSize: 20, fontWeight: "bold", color: theme.text }}>×</Text>
            </TouchableOpacity>

            {selectedActivity.emoji ? (
              <Text
                style={{
                  fontSize: 60,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {selectedActivity.emoji}
              </Text>
            ) : null}

            <Text style={[styles.alertTitle, { color: theme.text }]}>{selectedActivity.activityTitle}</Text>

            {selectedActivity.description ? (
              <Text style={[styles.alertMessage, { color: theme.text }]}>{selectedActivity.description}</Text>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
              <View style={[styles.badge, { backgroundColor: theme.main, borderColor: theme.border }]}>
                <Text style={[styles.badgeText, { color: theme.text }]}>{getCategoryName(selectedActivity.categoryId)}</Text>
              </View>
              {getMoodNames(selectedActivity.moodIds).map((mood, i) => (
                <View key={i} style={[styles.badge, { backgroundColor: theme.border, borderColor: theme.border }]}>
                  <Text style={[styles.badgeText, { color: theme.text }]}>{mood}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Ad / notice overlay */}
      <AdGate visible={showAd} seconds={AD_SECONDS} onComplete={onAdComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  filterMenu: { borderRadius: 12, position: "absolute", top: 80, padding: 16, marginHorizontal: 16},
  filterRow: { flexDirection: "row", marginBottom: 10 },
  filterItem: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#FCBF49", borderRadius: 20, marginRight: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 40,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  title: { fontSize: 22, fontWeight: "bold" },

  alertOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 100 },
  alertBox: { width: "80%", padding: 24, borderRadius: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, elevation: 8 },
  alertTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  alertMessage: { fontSize: 16, textAlign: "justify", marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginHorizontal: 4, marginVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "600" },
});
