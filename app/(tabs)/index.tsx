import React, { useRef, useState, useEffect } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Link } from "expo-router";
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { fetchCategories, fetchMoods } from "../../services/activityService";

const activities = ["Prize 1", "Prize 2", "Prize 3", "Prize 4", "Prize 5", "Prize 6"];

export default function AboutScreen() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const theme = Colors.light;

  // Fetch categories & moods on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const catData = await fetchCategories();
        const moodData = await fetchMoods();
        setCategories(catData.map((c) => c.categoryName));
        setMoods(moodData.map((m) => m.moodName));
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };
    loadFilters();
  }, []);

  // Toggle selection helpers
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const spinWheel = () => {
    if (spinning) return;
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
      setResult(activities[activityIndex]);
      spinAnim.setValue(endDeg % 360);
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const radius = 140;
  const anglePerSlice = (2 * Math.PI) / activities.length;

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top right filter button */}
      <View style={styles.topRight}>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
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
                key={cat}
                style={[
                  styles.filterItem,
                  selectedCategories.includes(cat) && { backgroundColor: "#f8d99d" },
                ]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={{ color: theme.text }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ color: theme.text, fontWeight: "bold", marginBottom: 10 }}>
            Select Mood:
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.filterRow}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.filterItem,
                  selectedMoods.includes(mood) && { backgroundColor: "#f8d99d" },
                ]}
                onPress={() => toggleMood(mood)}
              >
                <Text style={{ color: theme.text }}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Pointer */}
      <View style={{ alignItems: "center" }}>
        <View
          style={[
            styles.pointer,
            { transform: [{ rotate: "180deg" }], borderBottomColor: theme.tint },
          ]}
        />
      </View>

      {/* Wheel */}
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={radius * 2} height={radius * 2}>
          <G>
            {activities.map((activity, i) => {
              const midAngle = (i + 0.5) * anglePerSlice - Math.PI / 2;
              const textRadius = radius * 0.65;
              const x = radius + textRadius * Math.cos(midAngle);
              const y = radius + textRadius * Math.sin(midAngle);

              return (
                <React.Fragment key={i}>
                  <Path
                    d={createPath(i)}
                    fill={i % 2 === 0 ? theme.tint : "#4caf50"}
                    stroke={theme.background}
                    strokeWidth={2}
                  />
                  <SvgText
                    x={x}
                    y={y}
                    fill={theme.text}
                    fontWeight="bold"
                    fontSize={20}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {activity}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.tint }]}
        onPress={spinWheel}
        disabled={spinning}
      >
        <Text style={styles.buttonText}>{spinning ? "Spinning..." : "SPIN"}</Text>
      </TouchableOpacity>

      {/* Result */}
      {result && <Text style={[styles.result, { color: theme.text }]}>You won: {result}!</Text>}

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
    justifyContent: "center",
    alignItems: "center",
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
    padding: 10,
    backgroundColor: "#FCBF49",
    borderRadius: 8,
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
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  result: {
    fontSize: 18,
    marginTop: 20,
  },
});
