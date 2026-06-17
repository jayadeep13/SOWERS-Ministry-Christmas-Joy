// app/(app)/success.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, FontFamilies, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SuccessScreen() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="checkmark" size={48} color={Colors.gold} />
            </View>
          </View>
          <View style={styles.ring1} />
          <View style={styles.ring2} />
        </Animated.View>

        <Animated.View style={{ opacity: opacityAnim, alignItems: 'center' }}>
          <Text style={styles.title}>Data Saved{'\n'}Successfully!</Text>
          <Text style={styles.subtitle}>
            The child's record has been added to the{'\n'}Christmas Joy Programme database.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.blessingText}>
            "Every gift supports children,{'\n'}strengthens widows, and equips pastors."
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(app)/add-child')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={styles.primaryBtnText}>Add Another Child</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(app)/home')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  iconWrapper: {
    width: 120, height: 120, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl, position: 'relative',
  },
  iconOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  iconInner: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1.5,
    borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  ring1: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)' },
  ring2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: 'rgba(212,175,55,0.08)' },
  title: { fontSize: 32, fontFamily: FontFamilies.heading, color: Colors.white, textAlign: 'center', marginBottom: Spacing.md, lineHeight: 40 },
  subtitle: { fontSize: 15, color: Colors.whiteAlpha60, fontFamily: FontFamilies.body, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  divider: { width: 60, height: 2, backgroundColor: Colors.gold, borderRadius: 1, marginBottom: Spacing.xl, opacity: 0.5, alignSelf: 'center' },
  blessingText: { fontSize: 14, color: Colors.gold, fontFamily: FontFamilies.headingMedium, textAlign: 'center', lineHeight: 22, fontStyle: 'italic', marginBottom: Spacing.xxl },
  actions: { width: '100%', gap: Spacing.md },
  primaryBtn: {
    backgroundColor: Colors.gold, borderRadius: BorderRadius.full, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 10,
  },
  primaryBtnText: { color: '#000', fontSize: 17, fontFamily: FontFamilies.bodySemiBold },
  secondaryBtn: { height: 48, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.whiteAlpha20, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: Colors.whiteAlpha60, fontSize: 15, fontFamily: FontFamilies.body },
});
