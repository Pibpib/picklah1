import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/theme";
import { Question } from "../../src/questions";

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
  const [isTruthOrDare, setIsTruthOrDare] = useState(false);

  // Detect if it's the Truth or Dare game
  useEffect(() => {
    setIsTruthOrDare(questions.some((q) => q.type === "truth" || q.type === "dare"));
    if (visible && isTruthOrDare) {
      generateTruthAndDare();
    }
  }, [visible]);

  // Generate random truth and dare
  const generateTruthAndDare = () => {
    const truths = questions.filter((q) => q.type === "truth");
    const dares = questions.filter((q) => q.type === "dare");

    const randomTruth = truths[Math.floor(Math.random() * truths.length)];
    const randomDare = dares[Math.floor(Math.random() * dares.length)];

    setTruth(randomTruth);
    setDare(randomDare);
  };

  // For other games (This or That, Who's More Likely)
  const [randomQuestion, setRandomQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (visible && !isTruthOrDare) {
      const random = questions[Math.floor(Math.random() * questions.length)];
      setRandomQuestion(random);
    }
  }, [visible]);

  const handleNext = () => {
    if (isTruthOrDare) {
      generateTruthAndDare();
    } else {
      const random = questions[Math.floor(Math.random() * questions.length)];
      setRandomQuestion(random);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {/* Truth or Dare display */}
          {isTruthOrDare ? (
            <>
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.main }]}>Truth</Text>
                <Text style={[styles.question, { color: theme.text }]}>
                  {truth?.question}
                </Text>
              </View>
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.main }]}>Dare</Text>
                <Text style={[styles.question, { color: theme.text }]}>
                  {dare?.question}
                </Text>
              </View>
            </>
          ) : (
            // Other games (This or That, Who's More Likely)
            <Text style={[styles.question, { color: theme.text, textAlign: "center" }]}>
              {randomQuestion?.question}
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.button, { backgroundColor: theme.main }]}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Next</Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  question: {
    fontSize: 16,
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
