import { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Plus, Star, X, Check } from 'lucide-react-native';
import { C } from '@/constants/colors';
import { fetchReviews, fetchRooms, isApiConfigured, postReview } from '@/api/client';
import { REVIEWS, ROOMS } from '@/data/mockData';
import type { Review } from '@/types';

function Stars({ value, size = 13, interactive = false, onChange }: {
  value: number; size?: number; interactive?: boolean; onChange?: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} disabled={!interactive} onPress={() => onChange?.(n)}>
          <Star size={size} color={C.warning} fill={n <= value ? C.warning : 'transparent'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const INITIAL_FORM = { author: '', roomId: '', rating: 0, comment: '' };

export default function ReviewsScreen() {
  const useApi = isApiConfigured();
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [apiReviews, setApiReviews] = useState<Review[]>([]);
  const [roomTitles, setRoomTitles] = useState<Record<number, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof INITIAL_FORM, string>>>({});
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!useApi) return;
    let cancelled = false;

    fetchReviews({ limit: 100 })
      .then(revs => {
        if (!cancelled) setApiReviews(revs);
      })
      .catch(() => {
        if (!cancelled) setApiReviews([]);
      });

    fetchRooms({ limit: 200 })
      .then(rooms => {
        if (cancelled) return;
        const m: Record<number, string> = {};
        rooms.forEach(r => {
          m[r.id] = r.title;
        });
        setRoomTitles(m);
      })
      .catch(() => {
        /* keep existing titles / mock fallback in renderItem */
      });

    return () => {
      cancelled = true;
    };
  }, [useApi]);

  const allReviews = useApi ? apiReviews : [...localReviews, ...REVIEWS];
  const avg = (allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : 0
  ).toFixed(1);

  const set = <K extends keyof typeof INITIAL_FORM>(k: K, v: (typeof INITIAL_FORM)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof typeof INITIAL_FORM, string>> = {};
    if (!form.author.trim()) e.author = 'Name is required';
    if (form.rating === 0) e.rating = 'Select a rating';
    if (form.comment.trim().length < 10) e.comment = 'Write at least 10 characters';
    return e;
  };

  const handlePost = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setPostError(null);
    if (useApi) {
      try {
        await postReview({
          author: form.author.trim(),
          rating: form.rating,
          comment: form.comment.trim(),
          roomId: form.roomId ? Number(form.roomId) : undefined,
        });
        const revs = await fetchReviews({ limit: 100 });
        setApiReviews(revs);
      } catch (e) {
        setPostError(e instanceof Error ? e.message : 'Failed to post');
        return;
      }
    } else {
      const room = ROOMS.find(r => r.id === Number(form.roomId));
      setLocalReviews(prev => [{
        id: Date.now(), roomId: room?.id ?? null,
        author: form.author,
        avatar: form.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        rating: form.rating, date: new Date().toISOString().split('T')[0],
        comment: form.comment, isNew: true,
      }, ...prev]);
    }
    setPosted(true);
    setTimeout(() => { setShowModal(false); setPosted(false); setForm(INITIAL_FORM); setErrors({}); setPostError(null); }, 1600);
  };

  const renderItem = ({ item: rv }: { item: Review }) => {
    const roomTitle =
      (rv.roomId != null ? roomTitles[rv.roomId] : undefined)
      ?? ROOMS.find(r => r.id === rv.roomId)?.title;
    return (
      <View style={[s.reviewCard, rv.isNew && s.reviewCardNew]}>
        <View style={s.reviewTop}>
          <View style={s.avatar}><Text style={s.avatarText}>{rv.avatar}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.reviewAuthor}>{rv.author}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <Stars value={rv.rating} />
              <Text style={s.reviewDate}>{new Date(rv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
          {rv.isNew && <View style={s.newBadge}><Text style={s.newBadgeText}>New</Text></View>}
        </View>
        {roomTitle ? <View style={s.roomTag}><Text style={s.roomTagText}>{roomTitle}</Text></View> : null}
        <Text style={s.reviewComment}>{rv.comment}</Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Reviews</Text>
          <Text style={s.subtitle}>{allReviews.length} reviews from students</Text>
        </View>
        <TouchableOpacity style={s.writeBtn} onPress={() => setShowModal(true)}>
          <Plus size={15} color={C.white} />
          <Text style={s.writeBtnText}>Write</Text>
        </TouchableOpacity>
      </View>

      {/* Rating summary */}
      <View style={s.summaryCard}>
        <View style={s.summaryLeft}>
          <Text style={s.avgNum}>{avg}</Text>
          <Stars value={Math.round(Number(avg))} />
          <Text style={s.avgCount}>{allReviews.length} reviews</Text>
        </View>
        <View style={s.bars}>
          {[5, 4, 3, 2, 1].map(n => {
            const count = allReviews.filter(r => Math.round(r.rating) === n).length;
            const pct = allReviews.length ? (count / allReviews.length) * 100 : 0;
            return (
              <View key={n} style={s.barRow}>
                <Text style={s.barLabel}>{n}</Text>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as never }]} /></View>
                <Text style={s.barCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <FlatList
        data={allReviews}
        keyExtractor={r => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Write review modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity style={s.modal} activeOpacity={1}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Write a Review</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowModal(false)}>
                <X size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {posted ? (
              <View style={s.postedView}>
                <View style={s.postedIcon}><Check size={28} color={C.white} strokeWidth={3} /></View>
                <Text style={s.postedText}>Review posted!</Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={s.formField}>
                  <Text style={s.formLabel}>Your Name *</Text>
                  <TextInput style={[s.formInput, errors.author ? s.formInputErr : null]} placeholder="Nickname or full name" placeholderTextColor={C.textMuted} value={form.author} onChangeText={v => set('author', v)} />
                  {errors.author ? <Text style={s.formErr}>{errors.author}</Text> : null}
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>Rating *</Text>
                  <Stars value={form.rating} size={30} interactive onChange={v => set('rating', v)} />
                  {errors.rating ? <Text style={s.formErr}>{errors.rating}</Text> : null}
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>Listing ID (optional)</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. 12 — ties review to a room in API mode"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    value={form.roomId}
                    onChangeText={v => set('roomId', v)}
                  />
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>Your Review *</Text>
                  <TextInput
                    style={[s.formInput, s.formTextarea, errors.comment ? s.formInputErr : null]}
                    placeholder="Share your experience…"
                    placeholderTextColor={C.textMuted}
                    multiline numberOfLines={4} textAlignVertical="top"
                    value={form.comment} onChangeText={v => set('comment', v)}
                  />
                  {errors.comment ? <Text style={s.formErr}>{errors.comment}</Text> : null}
                </View>

                <TouchableOpacity style={s.postBtn} onPress={handlePost}>
                  <Text style={s.postBtnText}>Post Review</Text>
                </TouchableOpacity>
                {postError ? <Text style={s.formErr}>{postError}</Text> : null}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  writeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 50 },
  writeBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },

  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: C.card, borderRadius: 16, padding: 18, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  summaryLeft: { alignItems: 'center', gap: 6, minWidth: 64 },
  avgNum: { fontSize: 38, fontWeight: '800', color: C.primary, lineHeight: 42 },
  avgCount: { fontSize: 11, color: C.textMuted },
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, width: 10 },
  barTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.warning, borderRadius: 3 },
  barCount: { fontSize: 12, color: C.textMuted, width: 14, textAlign: 'right' },

  list: { paddingHorizontal: 20, paddingBottom: 32 },
  reviewCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  reviewCardNew: { borderColor: C.primary },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: C.text },
  reviewDate: { fontSize: 11, color: C.textMuted },
  newBadge: { backgroundColor: C.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  newBadgeText: { color: C.white, fontSize: 10, fontWeight: '700' },
  roomTag: { alignSelf: 'flex-start', backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  roomTagText: { fontSize: 12, fontWeight: '600', color: C.primary },
  reviewComment: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 6 },
  formInput: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: C.text },
  formInputErr: { borderColor: C.accent },
  formTextarea: { minHeight: 90 },
  formErr: { fontSize: 12, color: C.accent, fontWeight: '500', marginTop: 4 },
  postBtn: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 50, alignItems: 'center', marginTop: 4 },
  postBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  postedView: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  postedIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  postedText: { fontSize: 16, fontWeight: '700', color: C.text },
});
