import { useEffect, useRef, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MapPin, Calendar, Phone, MessageCircle, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/constants/colors';
import { fetchReviews, fetchRoom, isApiConfigured, postContactEvent } from '@/api/client';
import { ROOMS, REVIEWS } from '@/data/mockData';
import type { Review, Room } from '@/types';

const { width: W } = Dimensions.get('window');
const TYPE_COLOR: Record<string, string> = { studio: C.primary, single: C.success, shared: C.warning };
const TYPE_LABEL: Record<string, string> = { studio: 'Studio', single: 'Single', shared: 'Shared' };

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} color={C.warning} fill={n <= Math.round(value) ? C.warning : 'transparent'} />
      ))}
    </View>
  );
}

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const useApi = isApiConfigured();
  const [room, setRoom] = useState<Room | null>(() =>
    useApi ? null : ROOMS.find(r => r.id === Number(id)) ?? null
  );
  const [reviews, setReviews] = useState<Review[]>(() =>
    useApi ? [] : REVIEWS.filter(r => r.roomId === Number(id))
  );
  const [loading, setLoading] = useState(useApi);
  const [roomLoadError, setRoomLoadError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const galleryRef = useRef<ScrollView>(null);

  useEffect(() => {
    const rid = Number(id);
    if (Number.isNaN(rid)) {
      setRoom(null);
      setRoomLoadError(null);
      setLoading(false);
      return;
    }
    if (!useApi) {
      setRoom(ROOMS.find(r => r.id === rid) ?? null);
      setReviews(REVIEWS.filter(r => r.roomId === rid));
      setRoomLoadError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRoomLoadError(null);
    let pending = 2;
    const finishOne = () => {
      pending -= 1;
      if (pending === 0 && !cancelled) setLoading(false);
    };

    fetchRoom(rid)
      .then(r => {
        if (!cancelled) setRoom(r);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setRoom(null);
          setRoomLoadError(e?.message || 'Failed to load room');
        }
      })
      .finally(finishOne);

    fetchReviews({ room_id: rid })
      .then(rev => {
        if (!cancelled) setReviews(rev);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(finishOne);

    return () => {
      cancelled = true;
    };
  }, [id, useApi]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: C.textMuted, textAlign: 'center' }}>
          {roomLoadError ?? 'Room not found.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.primary, marginTop: 12 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const moveIn = new Date(room.available).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Photo gallery */}
        <View style={s.gallery}>
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          >
            {(room.photos?.length ? room.photos : []).length === 0 ? (
              <View style={[s.photo, { width: W }, s.photoPlaceholder]}>
                <Text style={s.photoPlaceholderText}>No photos yet</Text>
              </View>
            ) : (
              room.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[s.photo, { width: W }]} />
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color={C.text} />
          </TouchableOpacity>
          {room.photos.length > 0 && (
            <View style={s.dots}>
              {room.photos.map((_, i) => (
                <View key={i} style={[s.dot, i === photoIdx && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {room.photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.thumbsRow} contentContainerStyle={{ gap: 8, padding: 10 }}>
            {room.photos.map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setPhotoIdx(i);
                  galleryRef.current?.scrollTo({ x: i * W, animated: true });
                }}
              >
                <Image source={{ uri }} style={[s.thumb, i === photoIdx && s.thumbActive]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.body}>
          {/* Badge + rating row */}
          <View style={s.badgeRow}>
            <View style={[s.typeBadge, { backgroundColor: TYPE_COLOR[room.type] ?? C.border }]}>
              <Text style={s.typeBadgeText}>{TYPE_LABEL[room.type] ?? room.type}</Text>
            </View>
            <View style={s.ratingRow}>
              <Star size={13} color={C.warning} fill={C.warning} />
              <Text style={s.ratingText}>{room.rating} ({reviews.length || room.reviews})</Text>
            </View>
          </View>

          <Text style={s.title}>{room.title}</Text>

          <View style={s.metaCol}>
            <View style={s.metaItem}><MapPin size={14} color={C.textMuted} /><Text style={s.metaText}>{room.location}</Text></View>
            <View style={s.metaItem}><Calendar size={14} color={C.textMuted} /><Text style={s.metaText}>Available {moveIn}</Text></View>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceBig}>฿{room.price.toLocaleString()}</Text>
            <Text style={s.priceUnit}>/month</Text>
          </View>

          {/* Description */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>About this room</Text>
            <Text style={s.desc}>{room.description}</Text>
          </View>

          {/* Amenities */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Amenities</Text>
            <View style={s.amenGrid}>
              {room.amenities.map(a => (
                <View key={a} style={s.amenItem}>
                  <View style={s.amenCheck}><Check size={12} color={C.primary} /></View>
                  <Text style={s.amenText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Poster */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Posted by</Text>
            <View style={s.posterCard}>
              <View style={s.posterAvatar}><Text style={s.posterAvatarText}>{room.poster.avatar}</Text></View>
              <View>
                <Text style={s.posterName}>{room.poster.name}</Text>
                <Text style={s.posterRole}>Room Owner / Poster</Text>
              </View>
            </View>
          </View>

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Reviews</Text>
              <View style={{ gap: 12 }}>
                {reviews.map(rv => (
                  <View key={rv.id} style={s.reviewCard}>
                    <View style={s.reviewHeader}>
                      <View style={s.reviewAvatar}><Text style={s.reviewAvatarText}>{rv.avatar}</Text></View>
                      <View>
                        <Text style={s.reviewAuthor}>{rv.author}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <Stars value={rv.rating} />
                          <Text style={s.reviewDate}>{new Date(rv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.reviewComment}>{rv.comment}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky contact bar */}
      <SafeAreaView edges={['bottom']} style={s.contactBar}>
        {room.poster.phone?.trim() ? (
          <TouchableOpacity style={s.callBtn} onPress={() => {
            if (useApi) postContactEvent(room.id, 'call').catch(() => {});
            Linking.openURL(`tel:${room.poster.phone.trim()}`);
          }}>
            <Phone size={17} color={C.primary} />
            <Text style={s.callBtnText}>Call</Text>
          </TouchableOpacity>
        ) : (
          <View style={[s.callBtn, s.contactDisabled]} accessibilityRole="text">
            <Phone size={17} color={C.textMuted} />
            <Text style={[s.callBtnText, { color: C.textMuted }]}>No phone</Text>
          </View>
        )}
        {room.poster.line?.trim() ? (
          <TouchableOpacity
            style={s.lineBtn}
            onPress={() => {
              if (useApi) postContactEvent(room.id, 'line').catch(() => {});
              Linking.openURL(`https://line.me/ti/p/${encodeURIComponent(room.poster.line.replace(/^@/, '').trim())}`);
            }}
          >
            <MessageCircle size={17} color={C.white} />
            <Text style={s.lineBtnText}>Contact on LINE</Text>
          </TouchableOpacity>
        ) : (
          <View style={[s.lineBtn, s.contactDisabledLine]} accessibilityRole="text">
            <MessageCircle size={17} color={C.textMuted} />
            <Text style={[s.lineBtnText, { color: C.textMuted }]}>No LINE</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  gallery: { position: 'relative', backgroundColor: '#000' },
  photo: { height: 280, resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  photoPlaceholderText: { color: 'rgba(255,255,255,0.65)', fontWeight: '600', fontSize: 14 },
  backBtn: {
    position: 'absolute', top: 48, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: C.white, transform: [{ scale: 1.3 }] },
  thumbsRow: { backgroundColor: 'rgba(0,0,0,0.6)' },
  thumb: { width: 64, height: 48, borderRadius: 6, opacity: 0.6, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { opacity: 1, borderColor: C.white },

  body: { padding: 20, gap: 0 },

  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText: { color: C.white, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { fontSize: 13, color: C.textMuted },

  title: { fontSize: 20, fontWeight: '800', color: C.text, lineHeight: 28, marginBottom: 10 },
  metaCol: { gap: 6, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: C.textMuted, flex: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  priceBig: { fontSize: 28, fontWeight: '800', color: C.primary },
  priceUnit: { fontSize: 14, color: C.textMuted },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  desc: { fontSize: 14, color: C.textMuted, lineHeight: 22 },

  amenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%' },
  amenCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  amenText: { fontSize: 13, fontWeight: '500', color: C.text, flex: 1 },

  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  posterAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: C.white, fontSize: 15, fontWeight: '700' },
  posterName: { fontSize: 15, fontWeight: '700', color: C.text },
  posterRole: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  reviewCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: C.text },
  reviewDate: { fontSize: 11, color: C.textMuted },
  reviewComment: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  contactBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 14, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 50, backgroundColor: C.primaryLight },
  callBtnText: { color: C.primary, fontSize: 14, fontWeight: '700' },
  lineBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 50, backgroundColor: C.primary },
  lineBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  contactDisabled: { opacity: 0.85 },
  contactDisabledLine: { backgroundColor: C.border },
});
