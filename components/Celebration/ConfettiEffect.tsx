// components/Celebration/ConfettiEffect.tsx
// Ported from qep-tracker. Emoji-based confetti — cross-platform, no native deps
// beyond expo-haptics. Physics-based particles with gravity, rotation, fade.
// Language-learning themed emoji pool (stars, fireworks, brains, books).

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ConfettiParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  velocityY: number;
  velocityX: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiEffectProps {
  visible: boolean;
  intensity?: 'light' | 'normal' | 'intense';
  onComplete?: () => void;
  emojis?: string[];
}

const LEARNING_EMOJIS = ['🎉', '🎊', '⭐', '✨', '🌟', '💫', '🔥', '🧠', '📚', '🇷🇺'];

const INTENSITY_CONFIG = {
  light: { count: 8, duration: 2000 },
  normal: { count: 15, duration: 2500 },
  intense: { count: 25, duration: 3000 },
};

export function ConfettiEffect({ visible, intensity = 'normal', onComplete, emojis }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const config = INTENSITY_CONFIG[intensity];
  const emojiPool = emojis && emojis.length > 0 ? emojis : LEARNING_EMOJIS;

  useEffect(() => {
    if (!visible) {
      setParticles([]);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const centerX = 50;
    const initialParticles: ConfettiParticle[] = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)],
      x: centerX + (Math.random() - 0.5) * 40,
      y: 50,
      rotation: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.8,
      velocityY: -8 - Math.random() * 12,
      velocityX: (Math.random() - 0.5) * 8,
      rotationSpeed: (Math.random() - 0.5) * 15,
      opacity: 1,
    }));

    setParticles(initialParticles);
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / config.duration, 1);

      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: p.x + p.velocityX * 0.1,
          y: p.y + p.velocityY * 0.3,
          velocityY: p.velocityY + 0.5,
          rotation: p.rotation + p.rotationSpeed,
          opacity: 1 - progress,
          scale: p.scale * (1 - progress * 0.3),
        })),
      );

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setParticles([]);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [visible]);

  if (!visible || particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <Text
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: 24 * particle.scale,
            opacity: particle.opacity,
            transform: [
              { rotate: `${particle.rotation}deg` },
              { scale: particle.scale },
            ],
          }}
        >
          {particle.emoji}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    zIndex: 100,
  },
});

export default ConfettiEffect;
