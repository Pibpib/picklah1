import React, { useRef, useState, useEffect } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, ScrollView, useColorScheme, Alert } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { useRouter } from "expo-router";

import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Entypo from '@expo/vector-icons/Entypo';
import {fetchCategories, fetchMoods, fetchActivitiesFiltered, Activity, Category, Mood,} from "../../services/activityService";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../services/firebaseConfig";
import { getUserProfile,getUserSubscription } from "../../services/userService";

export default function AboutScreen() {
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
  const [alertMessage, setAlertMessage] = useState("");


  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser); // Log Firebase user

      if (currentUser) {
        setUser(currentUser);
        console.log("Current user UID:", currentUser.uid);

        // Fetch user profile from Firestore
        const profileData = await getUserProfile(currentUser.uid);
        setProfile(profileData);
        console.log("User profile data:", profileData);

        // Fetch user subscription
        const subscription = await getUserSubscription(currentUser.uid);
        const planType = subscription?.planType || "free";
        setUserPlan(planType);
        console.log("User plan type:", planType);
      } else {
        setUser(null);
        setProfile(null);
        console.log("No user is logged in");
        router.replace("/"); // Redirect to landing page
      }
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, []);


// Fetch categories & moods depending on user plan
useEffect(() => {
  const loadFilters = async () => {
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
  };

  if (userPlan) loadFilters();
}, [userPlan]);


// Fetch filtered activities
useEffect(() => {
  const loadActivities = async () => {
    const allActivities = await fetchActivitiesFiltered(selectedCategories, selectedMoods);

    let filtered = allActivities;

    if (userPlan === "free") {
      filtered = allActivities.filter((a) => {
  const category = categories.find((c) => c.id === a.categoryId);
  const moodAccess = a.moodIds.map(
    (mid) => moods.find((m) => m.id === mid)?.accessLevel
  );

  const allMoodsFree = moodAccess.every((lvl) => lvl === "free");
  const isCategoryFree = category?.accessLevel === "free";
  const isSystemActivity = a.createdBy === "system";

  console.log({
    activity: a.activityTitle,
    createdBy: a.createdBy,
    categoryAccess: category?.accessLevel,
    moodAccess,
    pass: isSystemActivity && isCategoryFree && allMoodsFree
  });

  return isSystemActivity && isCategoryFree && allMoodsFree;
});

    } else {
      filtered = allActivities.filter(
        (a) => a.createdBy === "system" || a.createdBy === user?.uid
      );
    }

    console.log("Filtered activities count:", filtered.length);
    setActivities(filtered);
  };

  if (categories.length > 0 && moods.length > 0) loadActivities();
}, [selectedCategories, selectedMoods, userPlan]);

  // Toggle helpers
  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleMood = (id: string) => {
    setSelectedMoods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.categoryName || "Unknown";
  };

  const getMoodNames = (moodIds: string[]) => {
    return moods
      .filter((m) => moodIds.includes(m.id))
      .map((m) => m.moodName);
  };

  // Spin wheel
  const spinWheel = () => {
    if (spinning || activities.length === 0) return;
    setSpinning(true);
    setResult(null);

    const activityIndex = Math.floor(Math.random() * activities.length);
    const turns = 5;
    const angle = 360 / activities.length;
    const endDeg = 360 * turns + (360 - activityIndex * angle) - angle / 2;

    Animated.timing(spinAnim, {
      toValue: endDeg,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setResult(activities[activityIndex].activityTitle);
      spinAnim.setValue(endDeg % 360);
      
      const chosen = activities[activityIndex];
      setSelectedActivity(chosen);
      setAlertMessage(`${chosen.activityTitle}!`);
      setCustomAlertVisible(true);
    });
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

  // Placeholder if no activities
  const displayActivities = activities.length > 0
    ? activities
    : [{ id: "none", activityTitle: "No activity", categoryId: "", moodId: "" }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Spin</Text>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
          <Ionicons name="filter" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {/* Filter menu */}
      {showFilter && (
        <View style={[styles.filterMenu, { backgroundColor: theme.filterDefault, borderColor: theme.borderbold, borderWidth: 1 }]}>
          <Text style={{ color: theme.text, marginBottom: 4, fontSize: 14 }}>
            Category
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterItem,
                    {
                      backgroundColor: isSelected
                        ? theme.main
                        : theme.filterDefault,
                      borderColor: isSelected ? theme.main : theme.borderbold,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 12,
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {cat.categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style = {{ color: theme.text, marginBottom: 4, fontSize: 14}}>
            Mood
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {moods.map((mood) => {
              const isSelected = selectedMoods.includes(mood.id);
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.filterItem,
                    {
                      backgroundColor: isSelected
                        ? theme.main
                        : theme.filterDefault,
                      borderColor: isSelected ? theme.main : theme.borderbold,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => toggleMood(mood.id)}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 12,
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {mood.moodName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Pointer */}
      <View style={{ alignItems: "center" }}>
        <Ionicons name="arrow-down-outline" size={30} color={theme.text} />
      </View>

      {/* Wheel */}
      <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 30 }}>
        <Svg width={radius * 2} height={radius * 2}>
          <G>
            {displayActivities.map((activity, i) => {
              const midAngle = (i + 0.5) * anglePerSlice - Math.PI / 2;
              const textRadius = radius * 0.65;
              const x = radius + textRadius * Math.cos(midAngle);
              const y = radius + textRadius * Math.sin(midAngle);

              return (
                <React.Fragment key={activity.id}>
                  <Path
                    d={createPath(i)}
                    fill={i % 2 === 0 ? theme.tint : theme.mainlight}
                    stroke={theme.text}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={x}
                    y={y}
                    fill={theme.text}
                    fontWeight="bold"
                    fontSize={16}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {activity.activityTitle}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.main }]}
        onPress={spinWheel}
        disabled={spinning || activities.length === 0}
      >
        <Entypo name="ccw" size={18} color={theme.text} />
        <Text style={styles.buttonText}>
          {spinning
            ? "Spinning..."
            : activities.length === 0
            ? "No Activities"
            : "SPIN"}
        </Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 10, color: theme.text, fontSize: 12 }}>
        {activities.length} activities available
      </Text>

      {customAlertVisible && selectedActivity && (
        <View style={[styles.alertOverlay]}>
          <View
            style={[
              styles.alertBox,
              { backgroundColor: theme.background, borderColor: theme.main },
            ]}
          >
            <Text style={[styles.alertTitle, { color: theme.text }]}>
              {selectedActivity.activityTitle}
            </Text>

            {/* Description */}
            {selectedActivity.description ? (
              <Text style={[styles.alertMessage, { color: theme.text }]}>
                {selectedActivity.description}
              </Text>
            ) : null}

            {/* Category + Moods */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {/* Category */}
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.main, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.text }]}>
                  {getCategoryName(selectedActivity.categoryId)}
                </Text>
              </View>

              {/* Moods */}
              {getMoodNames(selectedActivity.moodIds).map((mood, index) => (
                <View
                  key={index}
                  style={[
                    styles.badge,
                    { backgroundColor: theme.border, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.text }]}>{mood}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: theme.main }]}
              onPress={() => setCustomAlertVisible(false)}
            >
              <Text style={[styles.alertButtonText, { color: theme.text }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: "60%",
  },
  filterMenu: {
    borderRadius: 12,
    position: "absolute",
    top: 90,
    width: "90%",
    padding: 16,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FCBF49",
    borderRadius: 20,
    marginRight: 10,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: 20,
  },
  button: {
    flexDirection: "row",
    paddingHorizontal: 100,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    paddingLeft: 5,
    color: "#003049",
    fontSize: 20,
  },
  result: {
    fontSize: 18,
    marginTop: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    position: "absolute",
    top: 40,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  alertBox: {
    width: "80%",
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  alertButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

});
