import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Colors } from "../../constants/theme";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("⚠️ Error", "All fields are required.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/"); // navigate to home page
    } catch (error: any) {
      Alert.alert("⚠️ Error", error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Login</Text>
      <Text style={{ textAlign: "center", marginBottom: 20, color: theme.icon }}>
        Welcome back! Please login to continue.
      </Text>

      {/* Email */}
      <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
        <Ionicons name="mail-outline" size={20} color={theme.icon} style={styles.icon} />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { color: theme.text }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password */}
      <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
        <Ionicons name="lock-closed-outline" size={20} color={theme.icon} style={styles.icon} />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={[styles.input, { color: theme.text }]}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={theme.icon}
          />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.tint }]}
        onPress={handleLogin}
      >
        <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center", padding: 12 }}>
          LOGIN
        </Text>
      </TouchableOpacity>

      {/* Go to Sign Up */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
        <Text style={{ color: theme.icon }}>Don't have an account? </Text>
        <Link href="/auth/signup" style={{ color: theme.tint, fontWeight: "600" }}>
          Sign Up
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    marginBottom: 25,
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
});
