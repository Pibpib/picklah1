import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, useColorScheme, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";


export default function AddPlayersTruthOrDare() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<string[]>([]);

  const addPlayer = () => {
    const name = playerName.trim();
  if (name === "") return;

  // Check for duplicates (case-insensitive)
  if (players.some(p => p.toLowerCase() === name.toLowerCase())) {
    Alert.alert("Duplicate Name", "This player name already exists. Please enter a different name.");
    return;
  }

  setPlayers([...players, name]);
  setPlayerName("");
    if (playerName.trim() === "") return;
    setPlayers([...players, playerName.trim()]);
    setPlayerName("");
  };

  const removePlayer = (name: string) => {
    setPlayers(players.filter((p) => p !== name));
  };

  const startGame = () => {
    router.push({
      pathname: "/TruthOrDare",
      params: { players: JSON.stringify(players) }
    });
  };

  return (
    
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Add Players</Text>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter player name"
          placeholderTextColor={theme.text + "88"}
          style={[styles.input, { color: theme.text, borderColor: theme.main }]}
        />

        <TouchableOpacity onPress={addPlayer} style={[styles.addButton, { backgroundColor: theme.main }]}>
          <Ionicons name="add" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={players}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={[styles.playerItem, { borderColor: theme.border }]}>
            <Text style={[styles.playerText, { color: theme.text }]}>{item}</Text>
            <TouchableOpacity onPress={() => removePlayer(item)}>
              <Ionicons name="close-circle" size={24} color="#C0392B" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Start Game Button */}
      {players.length > 1 && (
        <TouchableOpacity onPress={startGame} style={[styles.startButton, { backgroundColor: theme.main }]}>
          <Text style={[styles.startText, { color: theme.text }]}>Start Game</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  inputRow: { flexDirection: "row", marginBottom: 20, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  addButton: { marginLeft: 10, padding: 10, borderRadius: 10 },
  playerItem: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 10 },
  playerText: { fontSize: 16, fontWeight: "600" },
  startButton: { marginTop: 20, padding: 15, borderRadius: 12, alignItems: "center" },
  startText: { fontSize: 18, fontWeight: "700" },
});
