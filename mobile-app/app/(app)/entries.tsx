import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontFamilies, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type FilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CUR_YEAR - 2 + i);

function makeDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Compact inline selector: cycles through values with < > arrows
function InlineSelect({
  value,
  options,
  display,
  onChange,
}: {
  value: number;
  options: number[];
  display: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const idx = options.indexOf(value);
  const prev = () => onChange(options[(idx - 1 + options.length) % options.length]);
  const next = () => onChange(options[(idx + 1) % options.length]);
  return (
    <View style={dpStyles.inlineSelect}>
      <TouchableOpacity onPress={prev} style={dpStyles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={14} color={Colors.gold} />
      </TouchableOpacity>
      <Text style={dpStyles.inlineVal}>{display(value)}</Text>
      <TouchableOpacity onPress={next} style={dpStyles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-forward" size={14} color={Colors.gold} />
      </TouchableOpacity>
    </View>
  );
}

function DatePickerRow({
  label,
  day, month, year,
  onDay, onMonth, onYear,
}: {
  label: string;
  day: number; month: number; year: number;
  onDay: (v: number) => void;
  onMonth: (v: number) => void;
  onYear: (v: number) => void;
}) {
  const totalDays = makeDays(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const safeDay = day > totalDays ? totalDays : day;

  return (
    <View style={dpStyles.row}>
      <Text style={dpStyles.label}>{label}</Text>
      <View style={dpStyles.selectors}>
        <View style={dpStyles.selectorGroup}>
          <Text style={dpStyles.selectorLabel}>Day</Text>
          <InlineSelect value={safeDay} options={days} display={(v) => String(v).padStart(2, '0')} onChange={onDay} />
        </View>
        <View style={dpStyles.selectorGroup}>
          <Text style={dpStyles.selectorLabel}>Month</Text>
          <InlineSelect value={month} options={Array.from({ length: 12 }, (_, i) => i)} display={(v) => MONTHS[v]} onChange={onMonth} />
        </View>
        <View style={dpStyles.selectorGroup}>
          <Text style={dpStyles.selectorLabel}>Year</Text>
          <InlineSelect value={year} options={YEARS} display={(v) => String(v)} onChange={onYear} />
        </View>
      </View>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  row: { marginBottom: Spacing.md },
  label: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  selectors: { flexDirection: 'row', gap: 8 },
  selectorGroup: { flex: 1, alignItems: 'center' },
  selectorLabel: {
    fontSize: 10,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    height: 42,
    paddingHorizontal: 4,
    width: '100%',
    justifyContent: 'space-between',
  },
  arrow: {
    padding: 4,
  },
  inlineVal: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: FontFamilies.bodySemiBold,
    minWidth: 36,
    textAlign: 'center',
  },
});

export default function EntriesScreen() {
  const { user } = useAuth();
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [entries, setEntries] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>((initialFilter as FilterType) || 'all');
  // If launched with filter=custom, open the date modal straight away
  const [showDateModal, setShowDateModal] = useState(initialFilter === 'custom');

  const today = new Date();
  const [fromDay, setFromDay] = useState(today.getDate());
  const [fromMonth, setFromMonth] = useState(today.getMonth());
  const [fromYear, setFromYear] = useState(today.getFullYear());
  const [toDay, setToDay] = useState(today.getDate());
  const [toMonth, setToMonth] = useState(today.getMonth());
  const [toYear, setToYear] = useState(today.getFullYear());

  // Applied custom range (only set when user taps Apply)
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'children'),
      where('employeeId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      all.sort((a: any, b: any) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setEntries(all);
    });
    return () => unsub();
  }, [user]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'today') {
      return entries.filter((e) => {
        const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
        return d.toDateString() === now.toDateString();
      });
    }
    if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);
      return entries.filter((e) => {
        const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
        return d >= weekAgo;
      });
    }
    if (filter === 'month') {
      return entries.filter((e) => {
        const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    if (filter === 'custom' && appliedFrom && appliedTo) {
      const from = new Date(appliedFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(appliedTo);
      to.setHours(23, 59, 59, 999);
      return entries.filter((e) => {
        const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
        return d >= from && d <= to;
      });
    }
    return entries;
  }, [entries, filter, appliedFrom, appliedTo]);

  const applyCustom = () => {
    setAppliedFrom(new Date(fromYear, fromMonth, fromDay));
    setAppliedTo(new Date(toYear, toMonth, toDay));
    setFilter('custom');
    setShowDateModal(false);
  };

  const downloadCSV = async () => {
    if (filtered.length === 0) {
      Alert.alert('No Data', 'There are no entries to download for this filter.');
      return;
    }
    try {
      const header = 'First Name,Last Name,Parent Name,Age,Gender,Village,Date\n';
      const rows = filtered.map((c) => {
        const date = c.createdAt?.toDate?.()
          ? c.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';
        const clean = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        return [clean(c.firstName), clean(c.lastName), clean(c.parentName), c.age ?? '', clean(c.gender), clean(c.village), clean(date)].join(',');
      }).join('\n');

      const csv = header + rows;
      const fileName = `entries_${filterLabel(filter).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Save / Share Entries CSV' });
    } catch {
      Alert.alert('Error', 'Could not generate the download file.');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const filterLabel = (f: FilterType) => {
    if (f === 'all') return 'All';
    if (f === 'today') return 'Today';
    if (f === 'week') return 'This Week';
    if (f === 'month') return 'This Month';
    if (f === 'custom' && appliedFrom && appliedTo) {
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return `${fmt(appliedFrom)} – ${fmt(appliedTo)}`;
    }
    return 'Custom';
  };

  const FILTERS: FilterType[] = ['all', 'today', 'week', 'month', 'custom'];

  const renderEntry = ({ item: child }: { item: any }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryLeft}>
        <View style={styles.entryAvatar}>
          <Text style={styles.entryAvatarText}>
            {(child.firstName?.[0] ?? '?')}{(child.lastName?.[0] ?? '')}
          </Text>
        </View>
      </View>
      <View style={styles.entryBody}>
        <View style={styles.entryTopRow}>
          <Text style={styles.entryName}>
            {child.firstName} {child.lastName}
          </Text>
          <View style={[
            styles.genderBadge,
            child.gender === 'Female' && styles.genderBadgeFemale,
          ]}>
            <Ionicons
              name={child.gender === 'Female' ? 'female' : 'male'}
              size={11}
              color={child.gender === 'Female' ? '#FF9EBA' : '#9EC5FF'}
            />
            <Text style={[
              styles.genderText,
              { color: child.gender === 'Female' ? '#FF9EBA' : '#9EC5FF' },
            ]}>
              {child.gender}
            </Text>
          </View>
        </View>
        <View style={styles.entryDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="location-outline" size={11} color={Colors.gold} />
            <Text style={styles.detailText}>{child.village}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="person-outline" size={11} color={Colors.whiteAlpha60} />
            <Text style={styles.detailText}>Age {child.age}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="people-outline" size={11} color={Colors.whiteAlpha60} />
            <Text style={styles.detailText}>{child.parentName}</Text>
          </View>
        </View>
        <Text style={styles.entryDate}>
          <Ionicons name="calendar-outline" size={11} color={Colors.whiteAlpha60} />{' '}
          {formatDate(child.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Entries</Text>
          <Text style={styles.headerSub}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={downloadCSV}
          style={styles.downloadBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="download-outline" size={18} color={Colors.gold} />
          <Text style={styles.downloadBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const isCustom = f === 'custom';
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  if (isCustom) {
                    setShowDateModal(true);
                  } else {
                    setFilter(f);
                  }
                }}
                activeOpacity={0.8}
              >
                {isCustom && (
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={active ? '#000' : Colors.whiteAlpha60}
                  />
                )}
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {active ? filterLabel(f) : (isCustom ? 'Custom' : filterLabel(f))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Entries List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={Colors.whiteAlpha20} />
          <Text style={styles.emptyText}>No entries found</Text>
          <Text style={styles.emptySubText}>
            {filter === 'all' ? 'No children added yet' : 'Try a different date range'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Custom Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={22} color={Colors.whiteAlpha60} />
              </TouchableOpacity>
            </View>

            <DatePickerRow
              label="From Date"
              day={fromDay} month={fromMonth} year={fromYear}
              onDay={setFromDay} onMonth={setFromMonth} onYear={setFromYear}
            />
            <DatePickerRow
              label="To Date"
              day={toDay} month={toMonth} year={toYear}
              onDay={setToDay} onMonth={setToMonth} onYear={setToYear}
            />

            <TouchableOpacity style={styles.applyBtn} onPress={applyCustom} activeOpacity={0.85}>
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.whiteAlpha10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
  },
  filterBarWrapper: {
    height: 52,
    justifyContent: 'center',
    marginBottom: 4,
  },
  filterBar: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.whiteAlpha10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: FontFamilies.bodySemiBold,
    color: Colors.whiteAlpha60,
  },
  filterChipTextActive: {
    color: '#000',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  entryCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 10,
  },
  entryLeft: { justifyContent: 'flex-start' },
  entryAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryAvatarText: {
    color: Colors.gold,
    fontSize: 15,
    fontFamily: FontFamilies.bodySemiBold,
  },
  entryBody: { flex: 1 },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryName: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FontFamilies.bodySemiBold,
    flex: 1,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(158,197,255,0.1)',
  },
  genderBadgeFemale: { backgroundColor: 'rgba(255,158,186,0.1)' },
  genderText: {
    fontSize: 11,
    fontFamily: FontFamilies.body,
  },
  entryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    color: Colors.whiteAlpha60,
    fontSize: 12,
    fontFamily: FontFamilies.body,
  },
  entryDate: {
    color: Colors.whiteAlpha60,
    fontSize: 12,
    fontFamily: FontFamilies.body,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: Colors.whiteAlpha60,
    fontSize: 16,
    fontFamily: FontFamilies.bodySemiBold,
  },
  emptySubText: {
    color: Colors.whiteAlpha60,
    fontSize: 13,
    fontFamily: FontFamilies.body,
    textAlign: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.whiteAlpha10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  downloadBtnText: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: FontFamilies.bodySemiBold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1a2f6e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
  },
  applyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  applyBtnText: {
    color: '#000',
    fontSize: 16,
    fontFamily: FontFamilies.bodySemiBold,
  },
});
