import { Colors } from "@/constants/theme";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Question } from "../src/questions";

interface GameOverlayProps {
  visible: boolean;
  title: string;
  questions: Question[];
  onClose: () => void;
}

export default function GameOverlay({
  visible,
  title,
  questions,
  onClose,
}: GameOverlayProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [truth, setTruth] = useState<Question | null>(null);
  const [dare, setDare] = useState<Question | null>(null);
  const [randomQuestion, setRandomQuestion] = useState<Question | null>(null);
  const [isTruthOrDare, setIsTruthOrDare] = useState(false);

  const [selectedType, setSelectedType] = useState<"truth" | "dare" | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Detect if the game is Truth or Dare
  useEffect(() => {
    const tod = questions.some((q) => q.type === "truth" || q.type === "dare");
    setIsTruthOrDare(tod);

    if (visible && tod) {
      generateTruthAndDare();
      resetAnimations();
    } else if (visible && !tod) {
      generateRandomQuestion();
    }
  }, [visible]);

  const generateTruthAndDare = () => {
    const truths = questions.filter((q) => q.type === "truth");
    const dares = questions.filter((q) => q.type === "dare");

    setTruth(truths[Math.floor(Math.random() * truths.length)]);
    setDare(dares[Math.floor(Math.random() * dares.length)]);
  };

  const generateRandomQuestion = () => {
    const random = questions[Math.floor(Math.random() * questions.length)];
    setRandomQuestion(random);
  };

  const resetAnimations = () => {
    scaleAnim.setValue(1);
    fadeAnim.setValue(0);
    flipAnim.setValue(0);
    setSelectedType(null);
    setIsRevealed(false);
  };

  const selectType = (type: "truth" | "dare") => {
    setSelectedType(type);
    setIsRevealed(false);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const revealCard = () => {
    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setIsRevealed(true));
  };

  const handleShuffle = () => {
    if (selectedType) {
      setIsRevealed(false);
      flipAnim.setValue(0);
      generateTruthAndDare();
      selectType(selectedType);
    }
  };

  const handleNext = () => {
    if (isTruthOrDare) {
      resetAnimations();
    } else {
      generateRandomQuestion();
    }
  };

  const spin = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "0deg"],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {/* Truth or Dare Section */}
          {isTruthOrDare ? (
            !selectedType ? (
              <View style={styles.choiceContainer}>
                <Pressable
                  style={[styles.choiceButton, { backgroundColor: theme.main }]}
                  onPress={() => selectType("truth")}
                >
                  <Text style={styles.choiceEmoji}>🤔</Text>
                  <Text style={styles.choiceButtonText}>TRUTH</Text>
                </Pressable>

                <Pressable
                  style={[styles.choiceButton, { backgroundColor: theme.main }]}
                  onPress={() => selectType("dare")}
                >
                  <Text style={styles.choiceEmoji}>🎯</Text>
                  <Text style={styles.choiceButtonText}>DARE</Text>
                </Pressable>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }, { rotateY: spin }],
                  },
                ]}
              >
                {!isRevealed ? (
                  <Pressable
                    style={[
                      styles.card,
                      { backgroundColor: selectedType === "truth" ? theme.main : theme.main },
                    ]}
                    onPress={revealCard}
                  >
                    <Text style={styles.cardTypeText}>
                      {selectedType === "truth" ? "🤔 TRUTH" : "🎯 DARE"}
                    </Text>
                    <Text style={styles.tapToReveal}>Tap to reveal</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.card, { backgroundColor: theme.main }]}>
                    <Text style={styles.cardTypeTextSmall}>
                      {selectedType === "truth" ? "🤔 TRUTH" : "🎯 DARE"}
                    </Text>
                    <Text style={styles.cardText}>
                      {selectedType === "truth" ? truth?.question : dare?.question}
                    </Text>
                  </View>
                )}

                {isRevealed && (
                  <View style={styles.actionButtons}>
                    <Pressable style={styles.shuffleButton} onPress={handleShuffle}>
                      <Text style={styles.shuffleButtonText}>Another {selectedType}</Text>
                    </Pressable>
                    <Pressable style={styles.resetButton} onPress={resetAnimations}>
                      <Text style={styles.resetButtonText}>Choose Again</Text>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            )
          ) : (
            // Other games (This or That / Who's More Likely)
            <Text style={[styles.question, { color: theme.text, textAlign: "center" }]}>
              {randomQuestion?.question}
            </Text>
          )}

          {/* Close button always visible */}
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, { backgroundColor: theme.border }]}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  choiceContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  choiceButton: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceEmoji: { fontSize: 48, marginBottom: 8 },
  choiceButtonText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  cardContainer: { marginTop: 24, width: "100%", alignItems: "center" },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTypeText: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 16 },
  cardTypeTextSmall: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  cardText: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  tapToReveal: { fontSize: 16, color: "#fff", opacity: 0.8 },
  actionButtons: { marginTop: 16, width: "100%", gap: 12 },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFBD69",
    gap: 8,
  },
  shuffleButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  resetButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  resetButtonText: { fontSize: 16, fontWeight: "600" },
  question: { fontSize: 16, textAlign: "center" },
  buttons: { flexDirection: "row", gap: 12, marginTop: 20 },
  button: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
