import { useEffect, useState } from "react";
import {StyleSheet, FlatList, ActivityIndicator, useColorScheme, TouchableOpacity, View, ScrollView, Text,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "../../../constants/theme";
import {
  fetchActivitiesFiltered,
  fetchCategories,
  fetchMoods,
  Activity,
  Category,
  Mood,
} from "../../../services/activityService";

export default function ActivityTab() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  // Fetch categories & moods on mount
  useEffect(() => {
    const loadFilters = async () => {
      const catData = await fetchCategories();
      const moodData = await fetchMoods();
      setCategories(catData);
      setMoods(moodData);

      // Default: select all
      setSelectedCategories(catData.map((c) => c.id));
      setSelectedMoods(moodData.map((m) => m.id));
    };
    loadFilters();
  }, []);

  // Fetch activities whenever filters change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [activityList, categoryList, moodList] = await Promise.all([
          fetchActivitiesFiltered(selectedCategories, selectedMoods),
          fetchCategories(),
          fetchMoods(),
        ]);

        const mapped = activityList.map((a: Activity) => {
          const category = categoryList.find((c: Category) => c.id === a.categoryId);
          const moodNames = a.moodIds
            .map((mId) => moodList.find((m) => m.id === mId)?.moodName || "Unknown")
            .join(", ");

          return {
            ...a,
            categoryName: category ? category.categoryName : "Unknown",
            moodNames,
          };
        });

        setActivities(mapped);
      } catch (error) {
        console.error("Error loading activities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const renderCard = ({ item }: any) => (
    <ThemedView style={[styles.card, { backgroundColor: theme.filterDefault }]}>
      <ThemedText type="title" style={[styles.cardTitle, { color: theme.text }]}>
        {item.activityTitle}
      </ThemedText>
      <ThemedText type="default" style={[styles.subtitle, { color: theme.text }]}>
        Category: {item.categoryName}
      </ThemedText>
      <ThemedText type="default" style={[styles.subtitle, { color: theme.text }]}>
        Mood: {item.moodNames}
      </ThemedText>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={{ color: theme.text }}>Loading activities...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[{ flex: 1, backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <ThemedText type="title" style={[styles.title, { color: theme.text }]}>
          Manage
        </ThemedText>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
          <Ionicons name="filter" size={24} color={theme.text} />
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
                      ? theme.main
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
                      ? theme.main
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

      {/* Activities list */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.text }}>No activities found.</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
    padding: 16,
    paddingTop: 12,
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontWeight: "700",
    fontSize: 22,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 10,
  },
  filterMenu: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
});
