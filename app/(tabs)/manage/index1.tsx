import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../services/firebaseConfig";
import { getUserProfile, getUserSubscription } from "../../../services/userService";
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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";

export default function ActivityTab() {
  const colorScheme = "light";
  const theme = Colors[colorScheme ?? "light"];

  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<"free" | "premium">("free");
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"activity" | "category" | "mood">("activity");
  const [activities, setActivities] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔹 Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser);

      if (currentUser) {
        setUser(currentUser);
        const profileData = await getUserProfile(currentUser.uid);
        const subscription = await getUserSubscription(currentUser.uid);
        const planType = subscription?.planType || "free";
        setUserPlan(planType);
        console.log("User plan type:", planType);
      } else {
        setUser(null);
        setUserPlan("free");
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Load data based on selected tab + plan
  useEffect(() => {
    if (userPlan) {
      loadData();
    }
  }, [selectedTab, userPlan]);

  async function loadData() {
    setLoading(true);
    try {
      if (selectedTab === "activity") {
        await loadActivities();
      } else if (selectedTab === "category") {
        await loadCategories();
      } else if (selectedTab === "mood") {
        await loadMoods();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Load Activities
  async function loadActivities() {
    const acts = await fetchActivitiesFiltered();
    const filteredActs: any[] = [];

    for (const a of acts) {
      // Fetch category + moods data
      const categoryDoc = a.categoryId ? await getDoc(doc(db, "Category", a.categoryId)) : null;
      const categoryData = categoryDoc?.data();

      const moodNames: string[] = [];
      for (const moodId of a.moodIds) {
        const moodDoc = await getDoc(doc(db, "Mood", moodId));
        const moodData = moodDoc.data();
        if (moodData) moodNames.push(moodData.moodName);
      }

      // Apply filtering by user plan
      if (userPlan === "premium") {
        if (a.createdBy === "system" || a.createdBy === user?.uid) {
          if (categoryData?.accessLevel === "premium") {
            filteredActs.push({ ...a, categoryName: categoryData.categoryName, moodNames });
          }
        }
      } else {
        if (a.createdBy === "system" && categoryData?.accessLevel === "free") {
          filteredActs.push({ ...a, categoryName: categoryData.categoryName, moodNames });
        }
      }
    }

    console.log("Filtered activities:", filteredActs.length);
    setActivities(filteredActs);
  }

  // 🔹 Load Categories
  async function loadCategories() {
    const cats = await fetchCategories();
    if (userPlan === "premium") {
      setCategories(cats.filter((c) => c.accessLevel === "premium"));
    } else {
      setCategories(cats.filter((c) => c.accessLevel === "free"));
    }
  }

  // 🔹 Load Moods
  async function loadMoods() {
    const mds = await fetchMoods();
    if (userPlan === "premium") {
      setMoods(mds.filter((m) => m.accessLevel === "premium"));
    } else {
      setMoods(mds.filter((m) => m.accessLevel === "free"));
    }
  }

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={theme.text} />;

    if (selectedTab === "activity") {
      return (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.activityTitle}</Text>
              {item.description && (
                <Text style={[styles.subtitle, { color: theme.text }]}>{item.description}</Text>
              )}
              <Text style={[styles.subtitle, { color: theme.text }]}>
                Category: {item.categoryName || "N/A"}
              </Text>
              <Text style={[styles.subtitle, { color: theme.text }]}>
                Moods: {item.moodNames?.join(", ") || "N/A"}
              </Text>
            </View>
          )}
        />
      );
    } else if (selectedTab === "category") {
      return (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.categoryName}</Text>
              <Text style={[styles.subtitle, { color: theme.text }]}>
                Access: {item.accessLevel}
              </Text>
            </View>
          )}
        />
      );
    } else {
      return (
        <FlatList
          data={moods}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.moodName}</Text>
              <Text style={[styles.subtitle, { color: theme.text }]}>
                Access: {item.accessLevel}
              </Text>
            </View>
          )}
        />
      );
    }
  };

  const handleAddPress = () => setModalVisible(true);

  const getModalTitle = () => {
    switch (selectedTab) {
      case "activity":
        return "Add New Activity";
      case "category":
        return "Add New Category";
      case "mood":
        return "Add New Mood";
    }
  };

  return (
    <ThemedView style={[{ flex: 1, backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <ThemedText type="title" style={[styles.title, { color: theme.text }]}>
          Manage
        </ThemedText>
        <TouchableOpacity onPress={handleAddPress}>
          <Ionicons name="add" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

        {/* Tab Buttons */}
        <View
            style={[
                styles.tabRow,
                { backgroundColor: theme.border },
            ]}
            >
            <TouchableOpacity
                style={[
                styles.tabButton,
                {
                    backgroundColor:
                    selectedTab === "activity" ? theme.main : theme.border,
                },
                ]}
                onPress={() => setSelectedTab("activity")}
            >
                <Ionicons name="list" size={22} color= {theme.text} style={{ marginBottom: 4 }}/>
                <Text
                style={[
                    styles.tabText,
                    { color: theme.text},
                ]}
                >
                Activity
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                styles.tabButton,
                {
                    backgroundColor:
                    selectedTab === "category" ? theme.main : theme.border,
                },
                ]}
                onPress={() => setSelectedTab("category")}
            >
                <Ionicons name="folder-outline" size={22} color= {theme.text} style={{ marginBottom: 4 }}/>
                <Text
                style={[
                    styles.tabText,
                    { color: theme.text},
                ]}
                >
                Category
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                styles.tabButton,
                {
                    backgroundColor:
                    selectedTab === "mood" ? theme.main : theme.border,
                },
                ]}
                onPress={() => setSelectedTab("mood")}
            >
                <Ionicons name="happy-outline" size={22} color= {theme.text} style={{ marginBottom: 4 }}/>
                <Text
                style={[
                    styles.tabText,
                    { color: theme.text},
                ]}
                >
                Mood
                </Text>
            </TouchableOpacity>
        </View>


      {/* Data List */}
      <View style={{ flex: 1, padding: 10 }}>{renderList()}</View>

      {/* Add Overlay */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  cardTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  card: {
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 6,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1, },
  title: {
    fontWeight: "700",
    fontSize: 22,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 10,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 4
  },
  tabButton: {
    width: screenWidth * 0.3-4,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
