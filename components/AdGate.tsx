// components/AdGate.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Video,ResizeMode} from 'expo-av';

export default function AdGate({
  visible,
  seconds = 15,
  onComplete,
  uri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
}: {
  visible: boolean;
  seconds?: number;
  onComplete: () => void;
  uri?: string;
}) {
  const [left, setLeft] = useState(seconds);
  const [ready, setReady] = useState(false);
  const player = useRef<Video>(null);

  useEffect(() => {
    if (!visible) return;
    setLeft(seconds);
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          onComplete();
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [visible, seconds, onComplete]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          {!ready && (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <ActivityIndicator />
              <Text style={s.dim}>Loading ad…</Text>
            </View>
          )}
          <Video
  ref={player}
  source={{ uri }}
  style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: '#000' }}
  resizeMode={ResizeMode.CONTAIN}   // <-- instead of "contain"
  shouldPlay={visible}
  isMuted={false}
  onLoad={() => setReady(true)}
  onError={() => setReady(true)}
/>

          <Text style={s.timer}>Please wait {left}s</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '86%', backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  dim: { color: '#6B7280', marginTop: 6, fontWeight: '600' },
  timer: { textAlign: 'center', marginTop: 10, fontWeight: '800', color: '#111827' },
});
