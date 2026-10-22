import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ArrowRight, Shield, Zap, Users } from 'lucide-react-native';
import { C } from '@/constants/colors';
import { fetchRooms, fetchStats, isApiConfigured } from '@/api/client';
import { ROOMS } from '@/data/mockData';
import RoomCard from '@/components/RoomCard';
import type { Room } from '@/types';

const FEATURES = [
  { icon: Search,  title: 'Browse & Filter',   desc: 'Filter by price, type, and move-in date.' },
  { icon: Users,   title: 'Find Roommates',     desc: 'Connect with compatible Chula roommates.' },
  { icon: Shield,  title: 'Verified Listings',  desc: 'Community-reviewed rooms with real photos.' },
  { icon: Zap,     title: 'Post Instantly',     desc: 'List your room live in under 2 minutes.' },
];

export default function HomeScreen() {
  const router = useRouter();
  const useApi = isApiConfigured();
  const [apiFeatured, setApiFeatured] = useState<Room[]>([]);
  const [heroStats, setHeroStats] = useState<{
    listings: string;
    users: string;
    rating: string;
  } | null>(null);

  useEffect(() => {
    if (!useApi) return;
    let cancelled = false;
    fetchRooms({ min_rating: 4.6, sort: 'rating', limit: 3 })
      .then(rows => {
        if (!cancelled) setApiFeatured(rows);
      })
      .catch(() => {
        if (!cancelled) setApiFeatured([]);
      });
    fetchStats()
      .then(s => {
        if (!cancelled) {
          setHeroStats({
            listings: `${s.listingsCount}+`,
            users: `${s.usersCount}+`,
            rating: `${s.avgRating.toFixed(1)}★`,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHeroStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [useApi]);

  const featured = useMemo(() => {
    if (useApi) return apiFeatured;
    return ROOMS.filter(r => r.rating >= 4.6).slice(0, 3);
  }, [useApi, apiFeatured]);

  const stats = heroStats ?? { listings: '120+', users: '340+', rating: '4.7★' };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>Chulalongkorn University · 2190512 App Dev</Text>
        <Text style={s.heroTitle}>Find Your Perfect{'\n'}CU Dorm & Roommate</Text>
        <Text style={s.heroSub}>Browse real listings near Chula — Soi Chula, Sam Yan, Siam, Henri Dunant. No LINE groups, no chaos.</Text>
        <View style={s.heroActions}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(tabs)/listings' as never)}>
            <Search size={15} color={C.primary} />
            <Text style={s.btnPrimaryText}>Browse Rooms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/(tabs)/post' as never)}>
            <Text style={s.btnOutlineText}>Post a Listing</Text>
          </TouchableOpacity>
        </View>
        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statNum}>{stats.listings}</Text>
            <Text style={s.statLabel}>CU Listings</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statNum}>{stats.users}</Text>
            <Text style={s.statLabel}>CU Students</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statNum}>{stats.rating}</Text>
            <Text style={s.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {/* Features */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Why DormMatch?</Text>
        <View style={s.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <View key={title} style={s.featureCard}>
              <View style={s.featureIcon}><Icon size={18} color={C.primary} /></View>
              <Text style={s.featureTitle}>{title}</Text>
              <Text style={s.featureDesc}>{desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Picks */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Top Picks</Text>
          <TouchableOpacity style={s.seeAll} onPress={() => router.push('/(tabs)/listings' as never)}>
            <Text style={s.seeAllText}>See all</Text>
            <ArrowRight size={14} color={C.primary} />
          </TouchableOpacity>
        </View>
        <View style={s.cardList}>
          {featured.map(room => <RoomCard key={room.id} room={room} />)}
        </View>
      </View>

      {/* CTA */}
      <View style={s.cta}>
        <Text style={s.ctaTitle}>Got a room to fill?</Text>
        <Text style={s.ctaDesc}>Post your listing for free and reach hundreds of Chula students instantly.</Text>
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/(tabs)/post' as never)}>
          <Text style={s.ctaBtnText}>Post a Room →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },

  hero: { backgroundColor: C.primaryDark, padding: 28, paddingTop: 60 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  heroTitle: { color: C.white, fontSize: 28, fontWeight: '800', lineHeight: 36, marginBottom: 12 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  heroActions: { flexDirection: 'row', gap: 12, marginBottom: 28, flexWrap: 'wrap' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 50 },
  btnPrimaryText: { color: C.primary, fontSize: 14, fontWeight: '700' },
  btnOutline: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  btnOutlineText: { color: C.white, fontSize: 14, fontWeight: '600' },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: C.white, fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  statDiv: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  section: { padding: 20, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 14 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: C.primary },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { width: '47%', backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 },
  featureIcon: { width: 36, height: 36, backgroundColor: C.primaryLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  featureTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  featureDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18 },

  cardList: { gap: 14 },

  cta: { margin: 20, backgroundColor: C.primaryLight, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: `${C.primary}22`, alignItems: 'center' },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: C.primary, marginBottom: 8 },
  ctaDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  ctaBtn: { backgroundColor: C.primary, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 50 },
  ctaBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
});
