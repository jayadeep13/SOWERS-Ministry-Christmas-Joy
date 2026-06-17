import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { router } from 'expo-router';
import { Colors, FontFamilies, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.75;
const CURRENT_YEAR = new Date().getFullYear();

export default function HomeScreen() {
  const { user, employeeData, logout } = useAuth();
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(DRAWER_W)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerX, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = (cb?: () => void) => {
    Animated.timing(drawerX, {
      toValue: DRAWER_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
      cb?.();
    });
  };

  const navigate = (path: string) => closeDrawer(() => router.push(path as any));

  const handleLogout = () => {
    closeDrawer(() => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    });
  };

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
      setRecentEntries(all.slice(0, 5));
    });
    return () => unsub();
  }, [user]);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Show actual name if set by admin, otherwise show phone-based greeting
  const hasRealName = employeeData?.name && employeeData.name !== 'Employee';
  const displayName = hasRealName ? employeeData.name : null;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/logo.webp')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brandSmall}>SOWERS MINISTRY</Text>
                <Text style={styles.brandSub}>Christmas Joy</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
              <View style={styles.hamLine} />
              <View style={[styles.hamLine, { width: 16 }]} />
              <View style={styles.hamLine} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              {displayName ? `Hello, ${displayName} 👋` : 'Hello 👋'}
            </Text>
            <Text style={styles.greetingPhone}>{user?.phoneNumber}</Text>
          </View>

          {/* Mission Banner */}
          <View style={styles.missionCard}>
            <Image
              source={require('../../assets/chj.webp')}
              style={styles.missionImg}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(11,28,61,0.15)', 'rgba(11,28,61,0.78)']}
              style={styles.missionOverlay}
            />
            <View style={styles.missionContent}>
              <Text style={styles.missionQuote}>"Every Child is Precious to God"</Text>
              <View style={styles.missionBadge}>
                <Ionicons name="gift-outline" size={12} color={Colors.gold} />
                <Text style={styles.missionBadgeText}>Christmas Joy Programme {CURRENT_YEAR}</Text>
              </View>
            </View>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{employeeData?.totalEntries ?? 0}</Text>
              <Text style={styles.statLabel}>Your Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {/* Always reflects current calendar year — updates automatically */}
              <Text style={styles.statNumber}>{CURRENT_YEAR}</Text>
              <Text style={styles.statLabel}>Programme Year</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(app)/add-child')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                style={styles.addButtonGradient}
              >
                <Ionicons name="person-add" size={22} color="#000" />
                <Text style={styles.addButtonText}>Add Child</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listButton}
              onPress={() => router.push('/(app)/entries')}
              activeOpacity={0.85}
            >
              <Ionicons name="list" size={22} color={Colors.gold} />
              <Text style={styles.listButtonText}>All Entries</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Entries */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Entries</Text>
              {recentEntries.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(app)/entries')}>
                  <Text style={styles.viewAllText}>View All →</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={Colors.whiteAlpha20} />
                <Text style={styles.emptyText}>No entries yet</Text>
                <Text style={styles.emptySubText}>Tap "Add Child" to register a child</Text>
              </View>
            ) : (
              recentEntries.map((child) => (
                <View key={child.id} style={styles.entryCard}>
                  <View style={styles.entryAvatar}>
                    <Text style={styles.entryAvatarText}>
                      {(child.firstName?.[0] ?? '?')}{(child.lastName?.[0] ?? '')}
                    </Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>
                      {child.firstName} {child.lastName}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {child.village} · Age {child.age} · {child.gender}
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <View style={[
                      styles.genderBadge,
                      child.gender === 'Female' && styles.genderBadgeFemale,
                    ]}>
                      <Ionicons
                        name={child.gender === 'Female' ? 'female' : 'male'}
                        size={12}
                        color={child.gender === 'Female' ? '#FF9EBA' : '#9EC5FF'}
                      />
                    </View>
                    <Text style={styles.entryDate}>{formatDate(child.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* ── Slide-in Drawer ── */}
      <Modal visible={drawerOpen} transparent animationType="none">
        <View style={styles.drawerOverlay}>
          {/* Dim background — tap to close */}
          <TouchableOpacity
            style={styles.drawerDimmer}
            activeOpacity={1}
            onPress={() => closeDrawer()}
          />

          {/* Drawer panel slides in from the right */}
          <Animated.View
            style={[styles.drawer, { transform: [{ translateX: drawerX }] }]}
          >
            <LinearGradient
              colors={['#1a3070', '#0d1e4a']}
              style={styles.drawerInner}
            >
              {/* Drawer Header — photo banner */}
              <View style={styles.drawerPhotoHeader}>
                <Image
                  source={require('../../assets/chrjoy.webp')}
                  style={styles.drawerPhotoImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(13,30,74,0.92)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <TouchableOpacity onPress={() => closeDrawer()} style={styles.drawerClose}>
                  <Ionicons name="close" size={18} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.drawerHeaderBottom}>
                  <Image
                    source={require('../../assets/logo.webp')}
                    style={styles.drawerLogo}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drawerBrand}>SOWERS MINISTRY</Text>
                    <Text style={styles.drawerSub}>Christmas Joy {CURRENT_YEAR}</Text>
                  </View>
                </View>
              </View>

              {/* Employee info */}
              <View style={styles.drawerProfile}>
                <View style={styles.drawerAvatar}>
                  <Ionicons name="person" size={22} color={Colors.gold} />
                </View>
                <View>
                  <Text style={styles.drawerName}>
                    {displayName ?? 'Employee'}
                  </Text>
                  <Text style={styles.drawerPhone}>{user?.phoneNumber}</Text>
                </View>
              </View>

              <View style={styles.drawerDivider} />

              {/* Menu Items */}
              <DrawerItem
                icon="list-outline"
                label="All Entries"
                onPress={() => navigate('/(app)/entries')}
              />
              <DrawerItem
                icon="today-outline"
                label="Today's Entries"
                onPress={() => navigate('/(app)/entries?filter=today')}
              />
              <DrawerItem
                icon="calendar-outline"
                label="Custom Date Range"
                onPress={() => navigate('/(app)/entries?filter=custom')}
              />
              <DrawerItem
                icon="person-add-outline"
                label="Add Child"
                onPress={() => navigate('/(app)/add-child')}
              />

              <View style={styles.drawerDivider} />

              {/* Sign Out */}
              <TouchableOpacity style={styles.drawerSignOut} onPress={handleLogout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={styles.drawerSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.drawerItemIcon}>
        <Ionicons name={icon as any} size={19} color={Colors.gold} />
      </View>
      <Text style={styles.drawerItemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.whiteAlpha20} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: '#fff',
  },
  brandSmall: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 1.5,
  },
  brandSub: { fontSize: 11, color: Colors.gold, fontFamily: FontFamilies.body },

  // Hamburger
  hamburgerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.whiteAlpha10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  hamLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.gold,
  },

  // Greeting
  greeting: { marginBottom: Spacing.lg },
  greetingText: {
    fontSize: 26,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
    marginBottom: 4,
  },
  greetingPhone: {
    fontSize: 14,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
  },

  // Stats card
  statsCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 32,
    fontFamily: FontFamilies.heading,
    color: Colors.gold,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.whiteAlpha10,
    marginVertical: 4,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  addButton: {
    flex: 2,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: FontFamilies.bodySemiBold,
  },
  listButton: {
    flex: 1,
    height: 54,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.whiteAlpha10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  listButtonText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: FontFamilies.bodySemiBold,
  },

  // Mission banner
  missionCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    height: 160,
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  missionImg: {
    width: '100%',
    height: '100%',
  },
  missionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  missionContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: 6,
  },
  missionQuote: {
    fontSize: 15,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  missionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11,28,61,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  missionBadgeText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: FontFamilies.bodySemiBold,
  },

  // Recent entries
  recentSection: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.heading,
    color: Colors.white,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: FontFamilies.bodySemiBold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: 8,
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
  entryCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 8,
  },
  entryAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryAvatarText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: FontFamilies.bodySemiBold,
  },
  entryInfo: { flex: 1 },
  entryName: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FontFamilies.bodySemiBold,
  },
  entryMeta: {
    color: Colors.whiteAlpha60,
    fontSize: 12,
    fontFamily: FontFamilies.body,
    marginTop: 2,
  },
  entryRight: { alignItems: 'center', gap: 4 },
  genderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(158,197,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBadgeFemale: { backgroundColor: 'rgba(255,158,186,0.1)' },
  entryDate: {
    fontSize: 10,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
  },

  // ── Drawer ──
  drawerPhotoHeader: {
    width: '100%',
    height: 160,
    position: 'relative',
    marginBottom: Spacing.md,
  },
  drawerPhotoImg: {
    width: '100%',
    height: '100%',
  },
  drawerHeaderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerDimmer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    width: DRAWER_W,
    height: '100%',
  },
  drawerInner: {
    flex: 1,
    paddingBottom: 40,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  drawerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: '#fff',
  },
  drawerBrand: {
    fontSize: 11,
    color: Colors.white,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 1.5,
  },
  drawerSub: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: FontFamilies.body,
  },
  drawerClose: {
    position: 'absolute',
    top: 48,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(212,175,55,0.08)',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    marginBottom: Spacing.md,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerName: {
    fontSize: 15,
    color: Colors.white,
    fontFamily: FontFamilies.bodySemiBold,
  },
  drawerPhone: {
    fontSize: 12,
    color: Colors.whiteAlpha60,
    fontFamily: FontFamilies.body,
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: Colors.whiteAlpha10,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.white,
    fontFamily: FontFamilies.bodyMedium,
  },
  drawerSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  drawerSignOutText: {
    fontSize: 15,
    color: Colors.error,
    fontFamily: FontFamilies.bodySemiBold,
  },
});
