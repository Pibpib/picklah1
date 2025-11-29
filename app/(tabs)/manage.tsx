import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { auth } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import { Colors } from "../../constants/theme";
import {
  Activity,
  Category,
  createActivity,
  deleteActivity,
  fetchActivitiesFiltered,
  fetchCategories,
  fetchMoods,
  Mood,
  updateActivity,
  addCategory,
  addMood,
  updateCategory,
  updateMood,
  deleteCategory,
  deleteMood
} from "../../services/activityService";

export default function ActivityTab() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // UI State copied from index1 style
  const [selectedTab, setSelectedTab] = useState<"activity" | "category" | "mood">("activity");
  const [modalVisible, setModalVisible] = useState(false);
  // minimal modal form state (kept local to this screen)
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newMoodIds, setNewMoodIds] = useState<string[]>([]);

  const [newEmoji, setNewEmoji] = useState<string | null>(null);
  const emojiInputRef = useRef<TextInput | null>(null);

  const toggleNewMood = (id: string) => {
    setNewMoodIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };
  
  const resetCreateForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewCategoryId(null);
    setNewMoodIds([]);
    setNewEmoji(null);
  };

  const handleDeleteActivity = (id: string) => {
    const target = activities.find((a) => a.id === id);
    if (target && target.createdBy && target.createdBy !== currentUserId) {
      Alert.alert(
        "Not allowed",
        "This activity was created by the system and cannot be deleted."
      );
      return;
    }

    Alert.alert(
      "Delete activity?",
      "Are you sure you want to delete this activity? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteActivity(id);
              setActivities((prev) => prev.filter((a) => a.id !== id));
            } catch (e) {
              console.error("Failed to delete activity", e);
            }
          },
        },
      ]
    );
  };
  const handleEditActivity = (item: any) => {
    if (item.createdBy && item.createdBy !== currentUserId) {
      Alert.alert(
        "Not allowed",
        "This activity was created by the system and cannot be edited."
      );
      return;
    }

    setEditingId(item.id);

    setNewTitle(item.activityTitle);
    setNewDesc(item.description || "");
    setNewCategoryId(item.categoryId);
    setNewMoodIds(item.moodIds || []);
    setNewEmoji(item.emoji || null);

    setModalVisible(true);
  };
  const handleSaveActivity = async () => {
    if (!newTitle || !newCategoryId || newMoodIds.length === 0) return;
  
    try {
      if (editingId) {
        // EDIT MODE
        await updateActivity(editingId, {
          activityTitle: newTitle,
          description: newDesc,
          categoryId: newCategoryId,
          moodIds: newMoodIds,
          emoji: newEmoji ?? "",
        });
  
        const catName =
          categories.find((c) => c.id === newCategoryId)?.categoryName || "Uncategorized";
        const moodNames = newMoodIds
          .map((mid) => moods.find((m) => m.id === mid)?.moodName || "")
          .filter(Boolean) as string[];
  
        setActivities(prev =>
          prev.map(a =>
            a.id === editingId
              ? {
                  ...a,
                  activityTitle: newTitle,
                  description: newDesc,
                  categoryId: newCategoryId,
                  moodIds: newMoodIds,
                  categoryName: catName,
                  moodNames,
                  emoji: newEmoji ?? "",
                }
              : a
          )
        );
      } else {
        // CREATE MODE
        await handleCreateActivity();
      }
    } catch (e) {
      console.error("Failed to save activity", e);
    } finally {
      setModalVisible(false);
      resetCreateForm();
      setEditingId(null);
    }
  };
  

  // Data state
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get current user ID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("🔥 Logged-in UID:", user?.uid ?? null);
      setCurrentUserId(user?.uid ?? null);
    });
  
    return unsub;
  }, []);
  // Load data depending on tab
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (selectedTab === "activity") {
          const [activityList, categoryList, moodList] = await Promise.all([
            fetchActivitiesFiltered(),
            fetchCategories(),
            fetchMoods(),
          ]);

          // Only show system activities (no createdBy or createdBy === "system") and activities created by the current user
          const visibleActivities = (activityList as any[]).filter((a) => {
          
            if (a.createdBy === "system") {
              return true;
            }

            // For user-created activities
            if (!currentUserId) return false;
            return a.createdBy === currentUserId;
          });

          const mapped = visibleActivities.map((a: Activity) => {
            const cat = categoryList.find((c) => c.id === a.categoryId);
            const moodNames = a.moodIds
              .map((mId) => moodList.find((m) => m.id === mId)?.moodName)
              .filter(Boolean) as string[];
            return {
              ...a,
              categoryName: cat?.categoryName || "Uncategorized",
              moodNames,
            };
          });

          setActivities(mapped);
          setCategories(categoryList);
          setMoods(moodList);
        } else if (selectedTab === "category") {
          const cats = await fetchCategories();
          setCategories(cats);
        } else {
          const ms = await fetchMoods();
          setMoods(ms);
        }
      } catch (e) {
        console.error("Error loading manage data", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedTab, currentUserId]);

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

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={theme.text} />;

    if (selectedTab === "activity") {
      return (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
renderItem={({ item }) => {
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>

      {/* ROW: Emoji + Title + Description */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        
        {/* Emoji */}
        {item.emoji ? (
          <Text style={styles.emoji}>{item.emoji}</Text>
        ) : (
          <Text style={[styles.emoji, { color: "transparent" }]}>⬤</Text>
        )}

        {/* Title + Description */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {item.activityTitle}
          </Text>

          {item.description ? (
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Row: Category + Mood */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        
        {/* Category */}
        <View style={[styles.categoryBadge, { backgroundColor: theme.main, marginRight: 8 }]}>
          <Text style={[styles.categoryText, { color: theme.text }]}>
            {item.categoryName}
          </Text>
        </View>

        {/* Mood badges */}
        {!!item.moodNames?.length &&
          item.moodNames.map((m: string, i: number) => (
            <View
              key={`${item.id}-m-${i}`}
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: theme.mainlight,
                  borderColor: theme.bordertint,
                  borderWidth: 1,
                  marginRight: 8,
                },
              ]}
            >
              <Text style={{ fontSize: 10 }}>{m}</Text>
            </View>
          ))}

      </View>

      {/* Actions */}
      {item.createdBy !== "system" && (
        <View style={styles.footerActionRow}>
          <TouchableOpacity
            onPress={() => handleEditActivity(item)}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="create-outline" size={18} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteActivity(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#E53935" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

          }}
        />
      );
    }

    if (selectedTab === "category") {
      return (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: theme.border }]}> 
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {item.categoryName}
              </Text>
              {item.accessLevel && (
                <Text style={[styles.subtitle, { color: theme.text }]}>Access: {item.accessLevel}</Text>
              )}
            </View>
          )}
        />
      );
    }

    return (
      <FlatList
        data={moods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: theme.border }]}> 
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {item.moodName}
            </Text>
            {item.accessLevel && (
              <Text style={[styles.subtitle, { color: theme.text }]}>Access: {item.accessLevel}</Text>
            )}
          </View>
        )}
      />
    );
  };

  if (!currentUserId) {
    console.warn("❗ UID not ready yet, blocking create");
    return;
  }

  const handleCreateActivity = async () => {
    if (!newTitle || !newCategoryId || newMoodIds.length === 0) return;
  
    try {
      const created = await createActivity({
        activityTitle: newTitle,
        description: newDesc,
        categoryId: newCategoryId,
        moodIds: newMoodIds,
        createdBy: currentUserId!,
        emoji: newEmoji ?? "",
      });
  
      const catName =
        categories.find((c) => c.id === newCategoryId)?.categoryName || "Uncategorized";
      const moodNames = newMoodIds
        .map((mid) => moods.find((m) => m.id === mid)?.moodName || "")
        .filter(Boolean) as string[];
  
      const mapped = {
        id: created?.id,
        activityTitle: created?.activityTitle ?? newTitle,
        description: created?.description ?? newDesc,
        categoryId: newCategoryId,
        moodIds: newMoodIds,
        categoryName: catName,
        moodNames,
        emoji: created?.emoji ?? (newEmoji ?? ""),
        createdBy: created?.createdBy ?? currentUserId,
      } as any;
  
      setActivities((prev) => [mapped, ...prev]);
      console.log("📌 Using UID on create:", currentUserId);
    } catch (e) {
      console.error("Failed to create activity", e);
    }
  };

  return (
    <ThemedView style={[{ flex: 1, backgroundColor: theme.background }]}> 
      {/* Top Bar */}
      <View style={styles.topBar}>
        <ThemedText type="title" style={[styles.title, { color: theme.text }]}>Manage</ThemedText>
        <TouchableOpacity onPress={handleAddPress}>
          <Ionicons name="add" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {/* Tab Buttons (index1 style) */}
      <View style={[styles.tabRow, { backgroundColor: theme.border }]}> 
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: selectedTab === "activity" ? theme.main : theme.border },
          ]}
          onPress={() => setSelectedTab("activity")}
        >
          <Ionicons name="list" size={22} color={theme.text} style={{ marginBottom: 4 }} />
          <Text style={[styles.tabText, { color: theme.text }]}>Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: selectedTab === "category" ? theme.main : theme.border },
          ]}
          onPress={() => setSelectedTab("category")}
        >
          <Ionicons name="folder-outline" size={22} color={theme.text} style={{ marginBottom: 4 }} />
          <Text style={[styles.tabText, { color: theme.text }]}>Category</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: selectedTab === "mood" ? theme.main : theme.border },
          ]}
          onPress={() => setSelectedTab("mood")}
        >
          <Ionicons name="happy-outline" size={22} color={theme.text} style={{ marginBottom: 4 }} />
          <Text style={[styles.tabText, { color: theme.text }]}>Mood</Text>
        </TouchableOpacity>
      </View>

      {/* Data List */}
      <View style={{ flex: 1, padding: 10 }}>{renderList()}</View>

      {/* Add Overlay */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <ScrollView 
      style={{ width: "100%" }} 
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
         
            {selectedTab === 'activity' && (
              <>
              {/* Emoji input using system keyboard */}
                <View style={styles.emojiHeaderRow}>
                  <TouchableOpacity
                    style={styles.emojiPicker}
                    onPress={() => emojiInputRef.current?.focus()}
                  >
                    <Text style={styles.emojiPickerText}>
                      {newEmoji || "+"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.emojiHintText}>Emoji (optional)</Text>

                  {/* Hidden TextInput to capture emoji from keyboard */}
                  <TextInput
                  ref={emojiInputRef}
                  value={newEmoji ?? ""}
                  onChangeText={(text) => {
                    // turn full string into emoji/codepoint array
                    const chars = Array.from(text || "");
                    // keep the LAST emoji/char the user typed
                    const last = chars[chars.length - 1] || "";
                    setNewEmoji(last || null);
                  }}
                  style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
                  keyboardType="default"
                />
                </View> 
                

                <TextInput
                  placeholder="Activity Title"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={{ width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}
                />
                <TextInput
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                  style={{ width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 70, marginBottom: 8 }}
                />

                {/* Category (single-select from Firebase) */}
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.wrapRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chipOutline, newCategoryId === cat.id && styles.chipSelected]}
                      onPress={() => setNewCategoryId(cat.id)}
                    >
                      <Text style={styles.chipText}>{cat.categoryName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Mood (multi-select from Firebase) */}
                <Text style={styles.sectionLabel}>Mood</Text>
                <View style={styles.wrapRow}>
                  {moods.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chipOutline, newMoodIds.includes(m.id) && styles.chipSelected]}
                      onPress={() => toggleNewMood(m.id)}
                    >
                      <Text style={styles.chipText}>{m.moodName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Footer buttons */}
                <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => { setModalVisible(false); resetCreateForm(); setEditingId(null); }}
              style={styles.btnCancel}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveActivity}
              disabled={!newTitle || !newCategoryId || newMoodIds.length === 0}
              style={[
                styles.btnCreate,
                (!newTitle || !newCategoryId || newMoodIds.length === 0) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.btnCreateText}>
                {editingId ? "Update" : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
              </>
            )}

            {selectedTab === 'category' && (
              <>
                <TextInput
                  placeholder="Category Name"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={{ width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}
                />
                <TouchableOpacity
                  onPress={() => { setModalVisible(false); setNewTitle(""); }}
                  style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginBottom: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
                </TouchableOpacity>
              </>
            )}

            {selectedTab === 'mood' && (
              <>
                <TextInput
                  placeholder="Mood Name"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={{ width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}
                />
                <TouchableOpacity
                  onPress={() => { setModalVisible(false); setNewTitle(""); }}
                  style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginBottom: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
                </TouchableOpacity>
              </>
            )}
            </ScrollView>
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
    marginBottom: 4,
  },
  emoji: {
    fontSize: 40,
    width: 60, 
    height: 60, 
    justifyContent: "center", 
    alignItems: "center",
    textAlign: "center",
  },
  emojiHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emojiPicker: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#AEB7C2",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiPickerText: {
    fontSize: 24,
  },
  emojiHintText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#555",
  },
  emojiOptionsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 8,
  },
  emojiOptionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#AEB7C2",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiOptionText: {
    fontSize: 20,
  },
  card: {
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 6,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 4,
  },
  title: {
    fontWeight: "700",
    fontSize: 22,
  },
  subtitle: {
    marginBottom: 4,
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
    paddingVertical: 4,
  },
  tabButton: {
    width: screenWidth * 0.3 - 4,
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
    maxHeight: "80%",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
    closeButton: {
    marginTop: 20,
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 10,
  },
  chipOutline: {
    borderWidth: 1,
    borderColor: '#AEB7C2',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  chipSelected: {
    backgroundColor: '#FCBF49',
    
  },
  chipText: {
    fontWeight: '700',
    color: '#1F2A3B',
  },
  wrapRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  footerRow: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#AEB7C2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnCancelText: {
    fontWeight: '800',
    fontSize: 18,
    color: '#1F2A3B',
    textAlign: 'center',
  },
  btnCreate: {
    flex: 1,
    backgroundColor: '#F2B94B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnCreateText: {
    fontWeight: '800',
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  footerActionRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});



