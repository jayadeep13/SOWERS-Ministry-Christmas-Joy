import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { FontFamilies, Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

// ── Inline gender chips ───────────────────────────────────────────────────────
function GenderChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={gc.row}>
      {['Male', 'Female', 'Other'].map((g) => (
        <TouchableOpacity
          key={g}
          style={[gc.chip, value === g && gc.chipActive]}
          onPress={() => onChange(g)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={g === 'Female' ? 'female' : g === 'Male' ? 'male' : 'person'}
            size={14}
            color={value === g ? '#fff' : '#6B7A9B'}
            style={{ marginRight: 4 }}
          />
          <Text style={[gc.chipText, value === g && gc.chipTextActive]}>{g}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const gc = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F0F2FA',
    borderWidth: 1.5,
    borderColor: '#E2E6F0',
  },
  chipActive: {
    backgroundColor: '#1a3070',
    borderColor: '#1a3070',
  },
  chipText: {
    fontSize: 14,
    fontFamily: FontFamilies.bodySemiBold,
    color: '#6B7A9B',
  },
  chipTextActive: { color: '#fff' },
});

// ── Village bottom-sheet dropdown ─────────────────────────────────────────────
function VillageDropdown({
  value,
  options,
  onSelect,
  loading,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[vd.trigger, value && vd.triggerFilled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#1a3070" />
        ) : (
          <Text style={value ? vd.value : vd.placeholder} numberOfLines={1}>
            {value || 'Select village / area'}
          </Text>
        )}
        <Ionicons name="chevron-down" size={16} color={value ? '#1a3070' : '#B0B8D0'} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={vd.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={vd.sheet} onStartShouldSetResponder={() => true}>
            <View style={vd.sheetTop}>
              <View style={vd.sheetHandle} />
            </View>
            <View style={vd.sheetHeader}>
              <Text style={vd.sheetTitle}>Select Village / Area</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#B0B8D0" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {options.length === 0 ? (
                <Text style={vd.emptyText}>No areas added yet. Ask admin to add areas.</Text>
              ) : (
                options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[vd.option, opt === value && vd.optionActive]}
                    onPress={() => { onSelect(opt); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={[vd.optionDot, opt === value && vd.optionDotActive]} />
                    <Text style={[vd.optionText, opt === value && vd.optionTextActive]}>
                      {opt}
                    </Text>
                    {opt === value && <Ionicons name="checkmark-circle" size={20} color="#1a3070" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
const vd = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    borderWidth: 1.5,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
  },
  triggerFilled: {
    borderColor: '#1a3070',
    backgroundColor: '#EEF0F8',
  },
  value: { flex: 1, fontSize: 15, fontFamily: FontFamilies.body, color: '#1a2040' },
  placeholder: { flex: 1, fontSize: 15, fontFamily: FontFamilies.body, color: '#B0B8D0' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  sheetTop: { alignItems: 'center', paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E3ED' },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F8',
  },
  sheetTitle: { fontSize: 17, fontFamily: FontFamilies.heading, color: '#1a2040' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
    gap: 12,
  },
  optionActive: { backgroundColor: '#EEF0F8' },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D5E8',
  },
  optionDotActive: { backgroundColor: '#1a3070' },
  optionText: { flex: 1, fontSize: 15, fontFamily: FontFamilies.body, color: '#3A4060' },
  optionTextActive: { fontFamily: FontFamilies.bodySemiBold, color: '#1a3070' },
  emptyText: {
    textAlign: 'center',
    color: '#9BA8C0',
    fontSize: 14,
    fontFamily: FontFamilies.body,
    paddingVertical: 40,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function AddChildScreen() {
  const { user, employeeData } = useAuth();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [otherVillage, setOtherVillage] = useState('');
  const [focusedField, setFocusedField] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    parentName: '',
    age: '',
    gender: '',
    village: '',
  });

  // Refs for keyboard chaining — tap Next and cursor jumps to next field
  const lastNameRef = useRef<TextInput>(null);
  const parentRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const otherVillageRef = useRef<TextInput>(null);

  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAreas(snap.docs.map((d) => d.data().name as string));
      setAreasLoading(false);
    });
    return () => unsub();
  }, []);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateForm = () => {
    if (!form.firstName.trim()) return 'Please enter the child\'s first name';
    if (!form.lastName.trim()) return 'Please enter the child\'s last name';
    if (!form.parentName.trim()) return 'Please enter the parent / guardian name';
    if (!form.age.trim() || isNaN(Number(form.age)) || Number(form.age) < 1)
      return 'Please enter a valid age';
    if (!form.gender) return 'Please select gender';
    if (!form.village) return 'Please select a village / area';
    if (form.village === 'Other' && !otherVillage.trim())
      return 'Please enter the village or area name';
    return null;
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) { Alert.alert('Missing Info', err); return; }
    setSubmitLoading(true);
    try {
      const finalVillage = form.village === 'Other' ? otherVillage.trim() : form.village;
      await addDoc(collection(db, 'children'), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        parentName: form.parentName.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        village: finalVillage,
        employeeId: user?.uid,
        employeeName: employeeData?.name || 'Unknown',
        employeePhone: user?.phoneNumber || '',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', user!.uid), { totalEntries: increment(1) });
      router.push('/(app)/success');
    } catch {
      Alert.alert('Error', 'Failed to save. Please check your connection.');
    }
    setSubmitLoading(false);
  };

  const villageOptions = areasLoading ? [] : [...areas, 'Other'];

  const inputStyle = (field: string) => [
    s.input,
    focusedField === field && s.inputFocused,
  ];

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* ── Blue photo banner ── */}
          <View style={s.banner}>
            <Image
              source={require('../../assets/chrjoy.webp')}
              style={s.bannerImg}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(11,28,61,0.1)', 'rgba(11,28,61,0.82)']}
              style={StyleSheet.absoluteFillObject}
            />
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.bannerTitle}>
              <Text style={s.bannerHeading}>Add Child</Text>
              <Text style={s.bannerSub}>Christmas Joy {new Date().getFullYear()}</Text>
            </View>
          </View>

          {/* ── White form body ── */}
          <View style={s.body}>

            {/* Progress hint */}
            <View style={s.hint}>
              <Ionicons name="flash" size={14} color="#F5A623" />
              <Text style={s.hintText}>Fill in order — use Next key to jump between fields</Text>
            </View>

            {/* ── Card 1: Child Name + Parent + Age ── */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Child &amp; Parent Details</Text>

              {/* First + Last side by side */}
              <View style={s.row}>
                <View style={s.half}>
                  <Text style={s.fieldLabel}>First Name</Text>
                  <TextInput
                    style={inputStyle('firstName')}
                    value={form.firstName}
                    onChangeText={(v) => set('firstName', v)}
                    placeholder="First name"
                    placeholderTextColor="#B0B8D0"
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField('')}
                    autoCapitalize="words"
                  />
                </View>
                <View style={s.half}>
                  <Text style={s.fieldLabel}>Last Name</Text>
                  <TextInput
                    ref={lastNameRef}
                    style={inputStyle('lastName')}
                    value={form.lastName}
                    onChangeText={(v) => set('lastName', v)}
                    placeholder="Last name"
                    placeholderTextColor="#B0B8D0"
                    returnKeyType="next"
                    onSubmitEditing={() => parentRef.current?.focus()}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField('')}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>Parent / Guardian Name</Text>
              <TextInput
                ref={parentRef}
                style={inputStyle('parentName')}
                value={form.parentName}
                onChangeText={(v) => set('parentName', v)}
                placeholder="Enter parent or guardian name"
                placeholderTextColor="#B0B8D0"
                returnKeyType="next"
                onSubmitEditing={() => ageRef.current?.focus()}
                onFocus={() => setFocusedField('parentName')}
                onBlur={() => setFocusedField('')}
                autoCapitalize="words"
              />

              <Text style={s.fieldLabel}>Age</Text>
              <TextInput
                ref={ageRef}
                style={[inputStyle('age'), { width: '40%' }]}
                value={form.age}
                onChangeText={(v) => set('age', v)}
                placeholder="e.g. 8"
                placeholderTextColor="#B0B8D0"
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="done"
                onFocus={() => setFocusedField('age')}
                onBlur={() => setFocusedField('')}
              />
            </View>

            {/* ── Card 2: Gender chips ── */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Gender</Text>
              <Text style={s.cardHint}>Tap to select instantly — no keyboard needed</Text>
              <GenderChips value={form.gender} onChange={(v) => set('gender', v)} />
            </View>

            {/* ── Card 3: Village dropdown ── */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Village / Area</Text>
              <Text style={s.cardHint}>
                {areasLoading ? 'Loading areas...' : areas.length === 0 ? 'No areas added yet — choose Other to type manually' : 'Select from the list or choose Other'}
              </Text>
              <VillageDropdown
                value={form.village}
                options={villageOptions}
                onSelect={(v) => { set('village', v); if (v !== 'Other') setOtherVillage(''); }}
                loading={areasLoading}
              />
              {form.village === 'Other' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={s.fieldLabel}>Type village / area name</Text>
                  <TextInput
                    ref={otherVillageRef}
                    style={inputStyle('otherVillage')}
                    value={otherVillage}
                    onChangeText={setOtherVillage}
                    placeholder="Enter village or area name"
                    placeholderTextColor="#B0B8D0"
                    returnKeyType="done"
                    onFocus={() => setFocusedField('otherVillage')}
                    onBlur={() => setFocusedField('')}
                    autoFocus
                    autoCapitalize="words"
                  />
                </View>
              )}
            </View>

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[s.submitBtn, submitLoading && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitLoading}
              activeOpacity={0.85}
            >
              {submitLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={s.submitBtnText}>Save Child Record</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },
  scroll: { flexGrow: 1 },

  // Banner
  banner: { width: SW, height: 190, position: 'relative' },
  bannerImg: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { position: 'absolute', bottom: 18, left: 18 },
  bannerHeading: {
    fontSize: 28,
    fontFamily: FontFamilies.heading,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: FontFamilies.body,
  },

  // White body
  body: {
    backgroundColor: '#F4F6FB',
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },

  // Hint bar
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#FFE4A3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#8B6914',
    fontFamily: FontFamilies.body,
    flex: 1,
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#1a3070',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: FontFamilies.bodySemiBold,
    color: '#1a2040',
    marginBottom: 2,
  },
  cardHint: {
    fontSize: 11,
    color: '#9BA8C0',
    fontFamily: FontFamilies.body,
    marginBottom: 12,
  },

  // Row layout
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  half: { flex: 1 },

  // Field
  fieldLabel: {
    fontSize: 11,
    color: '#6B7A9B',
    fontFamily: FontFamilies.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F9FC',
    borderWidth: 1.5,
    borderColor: '#E2E6F0',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FontFamilies.body,
    color: '#1a2040',
  },
  inputFocused: {
    borderColor: '#1a3070',
    backgroundColor: '#EEF1FA',
  },

  // Submit
  submitBtn: {
    backgroundColor: '#1a3070',
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1a3070',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: FontFamilies.bodySemiBold,
  },
});
