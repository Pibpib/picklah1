import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { miniGames } from "../../src/questions";
import GameOverlay from "../gameOverlay";
import { useRouter } from "expo-router";

export default function MiniGamesPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  type GameKey = keyof typeof miniGames;
  const [activeGame, setActiveGame] = useState<GameKey | null>(null);

  type GameItem = { id: GameKey; title: string; icon: string; description: string };
  const games: GameItem[] = [
    { id: "truthOrDare", title: "Truth or Dare", icon: "flame-outline", description: "Pick between answering a truth or doing a dare!" },
    { id: "thisOrThat", title: "This or That", icon: "swap-horizontal-outline", description: "Ask your friends to choose between two options!" },
    { id: "whosMoreLikely", title: "Who's More Likely", icon: "people-outline", description: "Find out who among your friends fits best!" },
  ];

  const renderItem = ({ item, index }: { item: GameItem; index: number }) => (
    <View style={[styles.card, { borderColor: theme.border }, index === 0 && { marginTop: 80 }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={item.icon as any} size={40} color={theme.main} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
      </View>
      <Text style={[styles.cardDesc, { color: theme.text }]}>{item.description}</Text>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: theme.main }]}
        onPress={() => {
          if (item.id === "truthOrDare") {
            router.push("/Players");
          } else {
            setActiveGame(item.id);
          }
        }}

      >
        <Text style={[styles.playButtonText, { color: colorScheme ==='dark' ?theme.background: theme.text}]}>Play</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Mini Games</Text>
      </View>

      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      />

      {/* Overlay for each game */}
      {activeGame && activeGame !== "truthOrDare" && (
        <GameOverlay
          visible={true}
          title={miniGames[activeGame].title}
          questions={miniGames[activeGame].questions}
          onClose={() => setActiveGame(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
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
  card: {
    borderRadius: 10,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { alignItems: "center", marginBottom: 6, gap: 10 },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  cardDesc: { fontSize: 14, textAlign: "center", marginBottom: 8 },
  playButton: {
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  playButtonText: { fontSize: 16, fontWeight: "700" },
});
