import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Star, Calendar } from 'lucide-react-native';
import { C } from '../constants/colors';
import type { Room } from '../types';

const TYPE_COLOR: Record<string, string> = {
  studio: C.primary,
  single: C.success,
  shared: C.warning,
};
const TYPE_LABEL: Record<string, string> = {
  studio: 'Studio',
  single: 'Single',
  shared: 'Shared',
};

export default function RoomCard({ room }: { room: Room }) {
  const router = useRouter();
  const moveIn = new Date(room.available).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/listings/${room.id}` as never)}
    >
      <View style={s.imgWrap}>
        {room.photos?.[0] ? (
          <Image source={{ uri: room.photos[0] }} style={s.img} />
        ) : (
          <View style={[s.img, s.imgPlaceholder]}>
            <Text style={s.imgPlaceholderText}>No photo</Text>
          </View>
        )}
        <View style={[s.badgeType, { backgroundColor: TYPE_COLOR[room.type] ?? C.border }]}>
          <Text style={s.badgeTypeText}>{TYPE_LABEL[room.type] ?? room.type}</Text>
        </View>
        <View style={s.badgePrice}>
          <Text style={s.badgePriceText}>฿{room.price.toLocaleString()}/mo</Text>
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{room.title}</Text>
        <View style={s.metaRow}>
          <MapPin size={12} color={C.textMuted} />
          <Text style={s.metaText} numberOfLines={1}>{room.location}</Text>
        </View>
        <View style={s.footer}>
          <View style={s.ratingRow}>
            <Star size={12} color={C.warning} fill={C.warning} />
            <Text style={s.ratingText}>{room.rating} ({room.reviews})</Text>
          </View>
          <View style={s.dateRow}>
            <Calendar size={12} color={C.textMuted} />
            <Text style={s.dateText}>{moveIn}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imgWrap: { position: 'relative', aspectRatio: 16 / 10 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: {
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgPlaceholderText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  badgeType: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20,
  },
  badgeTypeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgePrice: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  badgePriceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { padding: 14, gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.textMuted, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '600', color: C.warning },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: C.textMuted },
});
