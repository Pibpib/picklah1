import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../services/firebaseConfig";
import { saveUserProfile } from "../../services/userService";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // set display name in Firebase Auth
      await updateProfile(user, { displayName });

      // save to Firestore (user profile)
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
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Sign Up</Text>
      <TextInput placeholder="Display Name" value={displayName} onChangeText={setDisplayName} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <Button title="Sign Up" onPress={handleSignup} />
    </View>
  );
}
