import React, { useState } from "react";
import {View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, useColorScheme,} from "react-native";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "../../services/firebaseConfig";
import { saveUserProfile } from "../../services/userService";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Colors } from "../../constants/theme";

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"]; 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSignup = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert("⚠️ Error", "All fields are required.");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("⚠️ Error", "Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("⚠️ Error", "Passwords do not match. Please try again.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      Alert.alert(
        "📩 Verify Your Email",
        "We’ve sent a verification link to your email address. Please verify your account before signing in."
      );

      await updateProfile(user, { displayName });
      await saveUserProfile(user.uid, {
        displayName,
        photoURL: null,
        dob: null,
        favMoods: [],
        favCategories: [],
      });

      Alert.alert("✅ Success", "Account created!");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("⚠️ Error", "This email is already registered. Please use a different email.");
      } else {
        Alert.alert("⚠️ Error", error.message);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Sign Up</Text>

      <Text style={{ textAlign: "center", marginBottom: 20, color: theme.text }}>
        Create an account to get started!
      </Text>

      {/* Display Name */}
      <View style={[styles.inputContainer, { borderColor: theme.text, backgroundColor: colorScheme === "dark" ? "#2E2E36" : "#f9f9f9",}]}>
        <Ionicons name="person-outline" size={20} color={theme.text} style={styles.icon} />
        <TextInput
          placeholder="Display Name"
          placeholderTextColor="#aaa"
          value={displayName}
          onChangeText={setDisplayName}
          style={[styles.input, { color: theme.text }]}
        />
      </View>

      {/* Email */}
      <View style={[styles.inputContainer, { borderColor: theme.text, backgroundColor: colorScheme === "dark" ? "#2E2E36" : "#f9f9f9",}]}>
        <Ionicons name="mail-outline" size={20} color={theme.text} style={styles.icon} />
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
      <View style={[styles.inputContainer, { borderColor: theme.text, backgroundColor: colorScheme === "dark" ? "#2E2E36" : "#f9f9f9",}]}>
        <Ionicons name="lock-closed-outline" size={20} color={theme.text} style={styles.icon} />
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
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View style={[styles.inputContainer, { borderColor: theme.text, backgroundColor: colorScheme === "dark" ? "#2E2E36" : "#f9f9f9",}]}>
        <Ionicons name="lock-closed-outline" size={20} color={theme.text} style={styles.icon} />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          style={[styles.input, { color: theme.text }]}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Ionicons
            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Sign Up Button */}
      <View style={[styles.button, { backgroundColor: theme.tint }]}>
        <Button title="Sign Up" onPress={handleSignup} color={theme.tint} />
      </View>

      {/* Sign in link */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
        <Text style={{ color: theme.text }}>Already have an account? </Text>
        <Link href="/auth/login" style={{ color: theme.tint, fontWeight: "600" }}>
          Sign In
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
