import React, { useRef, useState, useEffect } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, ScrollView, useColorScheme, Alert } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Link } from "expo-router";
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Entypo from '@expo/vector-icons/Entypo';
import {fetchCategories, fetchMoods, fetchActivitiesFiltered, Activity, Category, Mood,} from "../../services/activityService";

export default function AboutScreen() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // Fetch categories & moods on mount
  useEffect(() => {
    const loadFilters = async () => {
      const catData = await fetchCategories();
      const moodData = await fetchMoods();
      setCategories(catData);
      setMoods(moodData);

      // Default select all
      setSelectedCategories(catData.map((c) => c.id));
      setSelectedMoods(moodData.map((m) => m.id));
    };
    loadFilters();
  }, []);

  // Fetch filtered activities whenever filters change
  useEffect(() => {
    const loadActivities = async () => {
      const filtered = await fetchActivitiesFiltered(selectedCategories, selectedMoods);
      setActivities(filtered);
    };
    loadActivities();
  }, [selectedCategories, selectedMoods]);

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
      Alert.alert("Activity", `Let's ${activities[activityIndex].activityTitle}!`, [{ text: "OK" }]);
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
      {/* Top right filter button */}
      <View style={styles.topRight}>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)} style={{ marginTop: 10 }}>
          <Ionicons name="filter" size={24} color={theme.icon} />
        </TouchableOpacity>
      </View>

      {/* Filter menu */}
      {showFilter && (
        <View style={styles.filterMenu}>
          <Text style={{ color: theme.text, fontWeight: "bold", marginBottom: 10 }}>
            Select Category:
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterItem,
                  {
                    backgroundColor: selectedCategories.includes(cat.id)
                      ? theme.filterSelected
                      : theme.filterDefault,
                  },
                ]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={{ color: theme.text }}>{cat.categoryName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ color: theme.text, fontWeight: "bold", marginBottom: 10 }}>
            Select Mood:
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.filterItem,
                  {
                    backgroundColor: selectedMoods.includes(mood.id)
                      ? theme.filterSelected
                      : theme.filterDefault,
                  },
                ]}
                onPress={() => toggleMood(mood.id)}
              >
                <Text style={{ color: theme.text }}>{mood.moodName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Pointer */}
      <View style={{ alignItems: "center" }}>
        <Ionicons name="arrow-down-outline" size={30} color={theme.icon} />
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
                    fill={i % 2 === 0 ? theme.tint : "#F77F00"}
                    stroke={theme.icon}
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
        style={[styles.button, { backgroundColor: theme.filterSelected }]}
        onPress={spinWheel}
        disabled={spinning || activities.length === 0}
      >
        <Entypo name="ccw" size={18} color={theme.icon} />
        <Text style={styles.buttonText}>
          {spinning
            ? "Spinning..."
            : activities.length === 0
            ? "No Activities"
            : "SPIN"}
        </Text>
      </TouchableOpacity>

      {/* Links */}
      <Link href="/auth/login" style={[styles.button, { backgroundColor: theme.tint }]}>
        <Text style={styles.buttonText}>Go to Login</Text>
      </Link>
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
  topRight: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  filterMenu: {
    position: "absolute",
    top: 90,
    width: "100%",
    paddingHorizontal: 10,
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
    paddingHorizontal: 80,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    paddingLeft: 5,
    color: "#003049",
    fontWeight: "bold",
    fontSize: 20,
  },
  result: {
    fontSize: 18,
    marginTop: 20,
  },
});
