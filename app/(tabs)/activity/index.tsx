import { useEffect, useState } from "react";
import { StyleSheet, FlatList, ActivityIndicator, useColorScheme } from "react-native";
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
  const colorScheme = useColorScheme(); // detects light or dark mode
  const theme = Colors[colorScheme ?? "light"]; // fallback to light

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [activityList, categoryList, moodList] = await Promise.all([
          fetchActivitiesFiltered(),
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
  }, []);

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
    <ThemedView style={[{ flex: 1, padding: 16, backgroundColor: theme.background }]}>
      <ThemedText type="title" style={[styles.title, { color: theme.text }]}>
        Activities
      </ThemedText>

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
    marginTop: 35,
    fontWeight: "600",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});