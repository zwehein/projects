import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { C } from '@/constants/colors';
import { fetchRooms, isApiConfigured } from '@/api/client';
import { ROOMS } from '@/data/mockData';
import RoomCard from '@/components/RoomCard';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/context/AuthContext';
import type { Room, RoomType } from '@/types';

type SortKey = 'rating' | 'price_asc' | 'price_desc' | 'newest';

const TYPES: Array<'all' | RoomType> = ['all', 'studio', 'single', 'shared'];
const TYPE_LABEL: Record<string, string> = { all: 'All', studio: 'Studio', single: 'Single', shared: 'Shared' };
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
  { key: 'newest', label: 'Move-in' },
];

export default function ListingsScreen() {
  const { loggedIn } = useAuth();
  const [typeFilter, setTypeFilter] = useState<'all' | RoomType>('all');
  const [maxPrice, setMaxPrice] = useState(6000);
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [apiRooms, setApiRooms] = useState<Room[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const useApi = isApiConfigured();

  useEffect(() => {
    if (!useApi) return;
    let cancelled = false;
    setApiLoading(true);
    setApiError(null);
    fetchRooms({
      type: typeFilter,
      max_price: maxPrice,
      q: search.trim() || undefined,
      sort: sortBy,
      limit: 100,
    })
      .then(data => {
        if (!cancelled) setApiRooms(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setApiError(e.message || 'Failed to load rooms');
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useApi, typeFilter, maxPrice, sortBy, search]);

  const filtered = useMemo(() => {
    let list = [...ROOMS];
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    list = list.filter(r => r.price <= maxPrice);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q));
    }
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') list.sort((a, b) => new Date(a.available).getTime() - new Date(b.available).getTime());
    return list;
  }, [typeFilter, maxPrice, sortBy, search]);

  const displayList = useApi ? apiRooms : filtered;

  if (!loggedIn) return <AuthGate message="Sign in to browse and search room listings." />;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Find a Room</Text>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilter(v => !v)}>
          <SlidersHorizontal size={15} color={C.text} />
          <Text style={s.filterBtnText}>Filters</Text>
          {(typeFilter !== 'all' || maxPrice < 6000) && <View style={s.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by title or location…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}>
            <X size={14} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type chips */}
      <View style={s.chips}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} style={[s.chip, typeFilter === t && s.chipActive]} onPress={() => setTypeFilter(t)}>
            <Text style={[s.chipText, typeFilter === t && s.chipTextActive]}>{TYPE_LABEL[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter panel */}
      {showFilter && (
        <View style={s.filterPanel}>
          <View style={s.filterRow}>
            <Text style={s.filterLabel}>Max Price: <Text style={{ color: C.primary, fontWeight: '700' }}>฿{maxPrice.toLocaleString()}/mo</Text></Text>
            <View style={s.priceButtons}>
              {[3000, 4000, 5000, 6000].map(p => (
                <TouchableOpacity key={p} style={[s.priceBtn, maxPrice === p && s.priceBtnActive]} onPress={() => setMaxPrice(p)}>
                  <Text style={[s.priceBtnText, maxPrice === p && s.priceBtnTextActive]}>฿{(p / 1000).toFixed(0)}k</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.filterRow}>
            <Text style={s.filterLabel}>Sort by</Text>
            <View style={s.sortButtons}>
              {SORT_OPTIONS.map(({ key, label }) => (
                <TouchableOpacity key={key} style={[s.sortBtn, sortBy === key && s.sortBtnActive]} onPress={() => setSortBy(key)}>
                  <Text style={[s.sortBtnText, sortBy === key && s.sortBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={() => { setTypeFilter('all'); setMaxPrice(6000); setSortBy('rating'); }}>
            <Text style={s.resetText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.resultCount}>
        {apiLoading ? 'Loading…' : `${displayList.length} room${displayList.length !== 1 ? 's' : ''} found`}
        {apiError ? ` — ${apiError}` : ''}
      </Text>

      <FlatList
        data={displayList}
        keyExtractor={r => String(r.id)}
        renderItem={({ item }) => <RoomCard room={item} />}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyText}>No rooms match your filters.</Text>
            <TouchableOpacity onPress={() => { setTypeFilter('all'); setMaxPrice(6000); setSearch(''); }}>
              <Text style={s.emptyBtn}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 50, paddingVertical: 8, paddingHorizontal: 14 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary, marginLeft: 2 },

  searchWrap: { marginHorizontal: 20, marginBottom: 12, position: 'relative' },
  searchInput: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 50, paddingVertical: 11, paddingHorizontal: 16, paddingRight: 40, fontSize: 14, color: C.text },
  clearBtn: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -7 }] },

  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  chip: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  chipTextActive: { color: C.white },

  filterPanel: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12, gap: 14 },
  filterRow: { gap: 8 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  priceButtons: { flexDirection: 'row', gap: 8 },
  priceBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  priceBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  priceBtnText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  priceBtnTextActive: { color: C.primary },
  sortButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sortBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: C.border },
  sortBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  sortBtnTextActive: { color: C.primary },
  resetText: { fontSize: 13, fontWeight: '600', color: C.accent },

  resultCount: { fontSize: 13, color: C.textMuted, paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: C.textMuted, marginBottom: 16 },
  emptyBtn: { fontSize: 14, fontWeight: '600', color: C.primary, backgroundColor: C.primaryLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 50 },
});
