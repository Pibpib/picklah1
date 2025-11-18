import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, router } from "expo-router";
import { miniGames } from "@/src/questions";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const REPEAT = 10;
const STOP_CYCLE = 2;

export default function TruthOrDareGame() {
  const { players } = useLocalSearchParams();
  const playerList: string[] = JSON.parse(players as string);

  const repeatedPlayers = Array(REPEAT).fill(playerList).flat();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [mode, setMode] = useState<"truth" | "dare" | null>(null);
  const [spinning, setSpinning] = useState(false);

  const truthQuestions = miniGames.truthOrDare.questions.filter(q => q.type === "truth");
  const dareQuestions = miniGames.truthOrDare.questions.filter(q => q.type === "dare");

  const scrollAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current; // for selected player bounce

  const runSpinAnimation = () => {
    setSelectedPlayer(null);
    setMode(null);
    setCurrentQuestion(null);
    setSpinning(true);

    scrollAnim.setValue(0);
    bounceAnim.setValue(1);

    const randomIndex = Math.floor(Math.random() * playerList.length);
    const targetIndex = (STOP_CYCLE - 1) * playerList.length + randomIndex;
    const totalScroll = targetIndex * ITEM_HEIGHT;

    Animated.timing(scrollAnim, {
      toValue: totalScroll,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setSelectedPlayer(playerList[randomIndex]);

      // Bounce effect
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    });
  };

  const pickTruth = () => {
    setMode("truth");
    const rand = Math.floor(Math.random() * truthQuestions.length);
    setCurrentQuestion(truthQuestions[rand].question);
  };

  const pickDare = () => {
    setMode("dare");
    const rand = Math.floor(Math.random() * dareQuestions.length);
    setCurrentQuestion(dareQuestions[rand].question);
  };

  const restartRound = () => {
    setSelectedPlayer(null);
    setCurrentQuestion(null);
    setMode(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* SPINNER */}
      <View style={[styles.spinnerBox, { borderColor: theme.main }]}>
        {selectedPlayer ? (
          <Animated.Text
            style={[
              styles.selectedPlayerName,
              { color: theme.text, transform: [{ scale: bounceAnim }] },
            ]}
          >
            {selectedPlayer}
          </Animated.Text>
        ) : (
          <Animated.View
            style={{
              transform: [
                {
                  translateY: scrollAnim.interpolate({
                    inputRange: [0, repeatedPlayers.length * ITEM_HEIGHT],
                    outputRange: [0, -repeatedPlayers.length * ITEM_HEIGHT],
                  }),
                },
              ],
            }}
          >
            {repeatedPlayers.map((p, i) => {
              const inputRange = [
                (i - 1) * ITEM_HEIGHT,
                i * ITEM_HEIGHT,
                (i + 1) * ITEM_HEIGHT,
              ];

              const scale = scrollAnim.interpolate({
                inputRange,
                outputRange: [0.8, 1, 0.8],
                extrapolate: "clamp",
              });

              const opacity = scrollAnim.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={i}
                  style={{
                    height: ITEM_HEIGHT,
                    justifyContent: "center",
                    alignItems: "center",
                    transform: [{ scale }],
                    opacity,
                  }}
                >
                  <Text style={[styles.spinItemText, { color: theme.text }]}>{p}</Text>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}
      </View>

      {/* SPIN BUTTON */}
      {!selectedPlayer && (
        <TouchableOpacity
          onPress={runSpinAnimation}
          disabled={spinning}
          style={[
            styles.spinBtn,
            { backgroundColor: theme.main, opacity: spinning ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.spinBtnText, { color: theme.text }]}>
            {spinning ? "Spinning..." : "Pick Player"}
          </Text>
        </TouchableOpacity>
      )}

      {/* TRUTH OR DARE BUTTONS */}
      {selectedPlayer && !mode && (
        <View style={styles.choiceRow}>
          <TouchableOpacity
            onPress={pickTruth}
            style={[styles.choiceBtn, { backgroundColor: theme.main }]}
          >
            <Text style={styles.choiceText}>Truth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickDare}
            style={[styles.choiceBtn, { backgroundColor: theme.tint }]}
          >
            <Text style={styles.choiceText}>Dare</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QUESTION DISPLAY */}
      {currentQuestion && (
        <View style={[styles.questionBox, { borderColor: theme.main }]}>
          <Text style={[styles.questionText, { color: theme.text }]}>{currentQuestion}</Text>
        </View>
      )}

      {/* NEXT ROUND */}
      {currentQuestion && (
        <TouchableOpacity
          onPress={restartRound}
          style={[styles.nextBtn, { backgroundColor: theme.main }]}
        >
          <Text style={[styles.nextText, { color: theme.text }]}>Next Round</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  title: { fontSize: 22, fontWeight: "700" },

  spinnerBox: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    borderWidth: 2,
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  spinItemText: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
  },

  selectedPlayerName: {
    fontSize: 32,
    fontWeight: "800",
  },

  spinBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  spinBtnText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  choiceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  choiceBtn: {
    width: 130,
    paddingVertical: 10,
    borderRadius: 10,
  },
  choiceText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  questionBox: {
    padding: 20,
    borderWidth: 2,
    borderRadius: 15,
    marginTop: 10,
  },
  questionText: { fontSize: 20, fontWeight: "600", textAlign: "center" },

  nextBtn: {
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  nextText: { fontSize: 18, fontWeight: "700", textAlign: "center" },
});
