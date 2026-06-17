import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firebaseConfig } from '../../lib/firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { router } from 'expo-router';
import { Colors, FontFamilies, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const FIREBASE_API_KEY = firebaseConfig.apiKey;
const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = SH * 0.42;

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState('');
  const [focusPhone, setFocusPhone] = useState(false);
  const [focusOtp, setFocusOtp] = useState(false);

  const sendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formattedPhone, recaptchaToken: 'bypass' }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setSessionInfo(json.sessionInfo);
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    if (!sessionInfo) {
      Alert.alert('Error', 'Please request OTP first.');
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(sessionInfo, otp);
      await signInWithCredential(auth, credential);
      router.replace('/(app)/home');
    } catch (error: any) {
      Alert.alert('Invalid OTP', error.message || 'The OTP you entered is incorrect. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      {/* ── Scrollable area: hero photo + input card ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero Photo */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/chj.webp')}
            style={styles.heroImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(11,28,61,0.5)', Colors.gradientStart]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo.webp')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>SOWERS MINISTRY</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Christmas Joy Programme</Text>
              <View style={styles.taglineLine} />
            </View>
          </View>
        </View>

        {/* Card — inputs only, NO button here */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.cardBg}
        >
          <View style={styles.card}>
            {/* Step indicator */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
            </View>

            <Text style={styles.cardTitle}>
              {step === 'phone' ? 'Welcome Back' : 'Verify OTP'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {step === 'phone'
                ? 'Enter your registered mobile number to continue'
                : `We sent a 6-digit code to +91 ${phone}`}
            </Text>

            {step === 'phone' ? (
              <>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={[styles.inputWrapper, focusPhone && styles.inputFocused]}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={Colors.whiteAlpha60}
                    keyboardType="phone-pad"
                    maxLength={10}
                    onFocus={() => setFocusPhone(true)}
                    onBlur={() => setFocusPhone(false)}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={[styles.inputWrapper, focusOtp && styles.inputFocused]}>
                  <Ionicons name="key-outline" size={20} color={Colors.whiteAlpha60} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="6-digit code"
                    placeholderTextColor={Colors.whiteAlpha60}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={() => setFocusOtp(true)}
                    onBlur={() => setFocusOtp(false)}
                    autoFocus
                  />
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </ScrollView>

      {/* ── Sticky footer: button ALWAYS above keyboard ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[Colors.gradientEnd, Colors.gradientEnd]}
          style={styles.footer}
        >
          {step === 'phone' ? (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.buttonGrad}>
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Send OTP</Text>
                    <Ionicons name="arrow-forward" size={18} color="#000" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyOTP}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.buttonGrad}>
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify & Login</Text>
                      <Ionicons name="checkmark" size={18} color="#000" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setStep('phone'); setSessionInfo(''); }}
              >
                <Ionicons name="arrow-back" size={14} color={Colors.whiteAlpha60} />
                <Text style={styles.backLinkText}>Change Number</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.verseBlock}>
            <Text style={styles.verseText}>"Let the little children come to me"</Text>
            <Text style={styles.verseRef}>— Matthew 19:14</Text>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.gradientEnd },

  // Scrollable area
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: { width: SW, height: HERO_H, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroContent: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: Colors.gold,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  logoImg: { width: 80, height: 80 },
  brandName: {
    fontSize: 20,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  taglineLine: { height: 1, width: 28, backgroundColor: Colors.gold, opacity: 0.7 },
  tagline: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: FontFamilies.body,
    letterSpacing: 1,
  },

  // Card (inputs only)
  cardBg: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
  },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.whiteAlpha20 },
  stepDotActive: { backgroundColor: Colors.gold },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.whiteAlpha10, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: Colors.gold },
  cardTitle: {
    fontSize: 26,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
    marginBottom: Spacing.lg,
    lineHeight: 19,
  },
  label: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 54,
  },
  inputFocused: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  countryCode: {
    color: Colors.gold,
    fontSize: 16,
    fontFamily: FontFamilies.bodySemiBold,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.whiteAlpha20,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamilies.body,
  },

  // Sticky footer (always above keyboard)
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    gap: 0,
  },
  button: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 0,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGrad: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 0.3,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  backLinkText: {
    color: Colors.whiteAlpha60,
    fontSize: 14,
    fontFamily: FontFamilies.body,
  },
  verseBlock: {
    alignItems: 'center',
    gap: 2,
    paddingTop: Spacing.sm,
  },
  verseText: {
    color: Colors.whiteAlpha60,
    fontSize: 12,
    fontFamily: FontFamilies.body,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  verseRef: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: FontFamilies.bodySemiBold,
    opacity: 0.7,
  },
});
