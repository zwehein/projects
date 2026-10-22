import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from '@/constants/colors';
import { isApiConfigured, postRoom, uploadPhoto } from '@/api/client';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/context/AuthContext';
import type { RoomType } from '@/types';

const AMENITIES = [
  'Air Conditioning', 'WiFi', 'Private Bathroom', 'Shared Bathroom',
  'Desk & Chair', 'Wardrobe', 'Mini Fridge', 'Microwave',
  'Washing Machine', 'Smart TV', 'CCTV', 'Parking',
  'Kitchenette', 'Full Kitchen', 'Balcony', 'Living Area',
];
const ROOM_TYPES: RoomType[] = ['single', 'studio', 'shared'];
const TYPE_LABEL: Record<RoomType, string> = { single: 'Single', studio: 'Studio', shared: 'Shared' };

interface FormState {
  title: string; type: RoomType; price: string; zone: string;
  distance: string; available: string; description: string;
  amenities: string[]; contactName: string; line: string; phone: string;
}

const INITIAL: FormState = {
  title: '', type: 'single', price: '', zone: '', distance: '',
  available: '', description: '', amenities: [], contactName: '', line: '', phone: '',
};

type PhotoEntry = { id: string; uri: string; uploading: boolean; uploadedUrl?: string; error?: string };

const MAX_PHOTOS = 5;

export default function PostScreen() {
  const { loggedIn } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'contact', string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [postedToApi, setPostedToApi] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const toggleAmenity = (a: string) => {
    set('amenities', form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a]);
  };

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;

    const incoming = result.assets.slice(0, remaining);
    const entries: PhotoEntry[] = incoming.map(a => ({
      id: `${Date.now()}_${Math.random()}`,
      uri: a.uri,
      uploading: isApiConfigured(),
    }));
    setPhotos(prev => [...prev, ...entries]);

    if (isApiConfigured()) {
      incoming.forEach((asset, i) => {
        const { id } = entries[i];
        uploadPhoto(asset)
          .then(url => setPhotos(prev => prev.map(p => p.id === id ? { ...p, uploading: false, uploadedUrl: url } : p)))
          .catch(() => setPhotos(prev => prev.map(p => p.id === id ? { ...p, uploading: false, error: 'Failed' } : p)));
      });
    }
  };

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.price || isNaN(Number(form.price))) e.price = 'Enter a valid price';
    if (!form.zone.trim()) e.zone = 'Zone / location is required';
    if (!form.contactName.trim()) e.contactName = 'Your name is required';
    if (!form.phone.trim() && !form.line.trim()) e.contact = 'Add at least one contact method';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (photos.some(p => p.uploading)) { setSubmitError('Photos are still uploading, please wait.'); return; }
    setSubmitError(null);
    if (isApiConfigured()) {
      setSubmitting(true);
      try {
        await postRoom({
          title: form.title.trim(),
          type: form.type,
          price: Number(form.price),
          location: form.zone.trim(),
          distance: form.distance.trim(),
          available: form.available.trim(),
          description: form.description.trim(),
          amenities: form.amenities,
          contactName: form.contactName.trim(),
          line: form.line.trim(),
          phone: form.phone.trim(),
          photos: photos.filter(p => p.uploadedUrl).map(p => p.uploadedUrl as string),
        });
        setPostedToApi(true);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Could not publish listing');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    } else {
      setPostedToApi(false);
    }
    setSubmitted(true);
  };

  if (!loggedIn) return <AuthGate message="Sign in to post a room listing." />;

  if (submitted) {
    return (
      <View style={s.successScreen}>
        <View style={s.successIcon}><Check size={36} color={C.white} strokeWidth={3} /></View>
        <Text style={s.successTitle}>{postedToApi ? 'Listing Published!' : 'Draft Ready'}</Text>
        <Text style={s.successDesc}>
          {postedToApi
            ? 'Your room is now live and visible to all CU students.'
            : 'API URL is not set — nothing was saved on the server. Set EXPO_PUBLIC_API_URL to publish for real.'}
        </Text>
        <TouchableOpacity style={s.successBtn} onPress={() => { setSubmitted(false); setPostedToApi(false); setForm(INITIAL); setErrors({}); setPhotos([]); }}>
          <Text style={s.successBtnText}>Post Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={s.pageTitle}>Post a Room</Text>
      <Text style={s.pageSub}>Fill in the details and your listing goes live for all CU students immediately.</Text>

      {/* Photos */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Photos</Text>
          <Text style={s.cardHint}>{photos.length}/{MAX_PHOTOS}</Text>
        </View>

        {photos.length > 0 && (
          <View style={s.thumbGrid}>
            {photos.map(p => (
              <View key={p.id} style={s.thumbWrap}>
                <Image source={{ uri: p.uri }} style={s.thumb} />
                {p.uploading && (
                  <View style={s.thumbOverlay}>
                    <ActivityIndicator size="small" color={C.white} />
                  </View>
                )}
                {p.error && (
                  <View style={[s.thumbOverlay, { backgroundColor: 'rgba(200,0,0,0.55)' }]}>
                    <Text style={{ color: C.white, fontSize: 10, fontWeight: '700' }}>!</Text>
                  </View>
                )}
                <TouchableOpacity style={s.thumbRemove} onPress={() => removePhoto(p.id)}>
                  <X size={10} color={C.white} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ))}
            {canAddMore && (
              <TouchableOpacity style={s.thumbAdd} onPress={pickPhotos}>
                <Upload size={20} color={C.primary} />
                <Text style={s.thumbAddText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {photos.length === 0 && (
          <TouchableOpacity style={s.photoUpload} onPress={pickPhotos}>
            <Upload size={28} color={C.primary} />
            <Text style={s.photoUploadText}>Tap to upload photos</Text>
            <Text style={s.photoUploadHint}>Up to {MAX_PHOTOS} photos · JPG / PNG</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Room details */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Room Details</Text>

        <View style={s.field}>
          <Text style={s.label}>Listing Title *</Text>
          <TextInput style={[s.input, errors.title ? s.inputErr : null]} placeholder="e.g. Bright Studio near Eng Faculty" placeholderTextColor={C.textMuted} value={form.title} onChangeText={v => set('title', v)} />
          {errors.title ? <Text style={s.errText}>{errors.title}</Text> : null}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Room Type *</Text>
          <View style={s.segmented}>
            {ROOM_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.segBtn, form.type === t && s.segBtnActive]} onPress={() => set('type', t)}>
                <Text style={[s.segBtnText, form.type === t && s.segBtnTextActive]}>{TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Monthly Price (฿) *</Text>
          <TextInput style={[s.input, errors.price ? s.inputErr : null]} placeholder="e.g. 4500" placeholderTextColor={C.textMuted} keyboardType="number-pad" value={form.price} onChangeText={v => set('price', v)} />
          {errors.price ? <Text style={s.errText}>{errors.price}</Text> : null}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Zone / Location *</Text>
          <TextInput style={[s.input, errors.zone ? s.inputErr : null]} placeholder="e.g. Soi Chula 5 — near Faculty of Engineering" placeholderTextColor={C.textMuted} value={form.zone} onChangeText={v => set('zone', v)} />
          {errors.zone ? <Text style={s.errText}>{errors.zone}</Text> : null}
        </View>

        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Walk to Class</Text>
            <TextInput style={s.input} placeholder="e.g. 5 min walk" placeholderTextColor={C.textMuted} value={form.distance} onChangeText={v => set('distance', v)} />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Available From</Text>
            <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} value={form.available} onChangeText={v => set('available', v)} />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, s.textarea]} placeholder="Describe the room — size, furniture, building rules, preferred roommate…" placeholderTextColor={C.textMuted} multiline numberOfLines={4} textAlignVertical="top" value={form.description} onChangeText={v => set('description', v)} />
        </View>
      </View>

      {/* Amenities */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Amenities</Text>
        <View style={s.amenWrap}>
          {AMENITIES.map(a => {
            const selected = form.amenities.includes(a);
            return (
              <TouchableOpacity key={a} style={[s.amenChip, selected && s.amenChipActive]} onPress={() => toggleAmenity(a)}>
                {selected && <Check size={11} color={C.primary} />}
                <Text style={[s.amenChipText, selected && s.amenChipTextActive]}>{a}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Contact */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Contact Info</Text>
        <View style={s.field}>
          <Text style={s.label}>Your Name *</Text>
          <TextInput style={[s.input, errors.contactName ? s.inputErr : null]} placeholder="Full name or nickname" placeholderTextColor={C.textMuted} value={form.contactName} onChangeText={v => set('contactName', v)} />
          {errors.contactName ? <Text style={s.errText}>{errors.contactName}</Text> : null}
        </View>
        <View style={s.field}>
          <Text style={s.label}>LINE ID</Text>
          <TextInput style={s.input} placeholder="@your_line_id" placeholderTextColor={C.textMuted} value={form.line} onChangeText={v => set('line', v)} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Phone Number</Text>
          <TextInput style={s.input} placeholder="e.g. 081-234-5678" placeholderTextColor={C.textMuted} keyboardType="phone-pad" value={form.phone} onChangeText={v => set('phone', v)} />
        </View>
        {errors.contact ? <Text style={s.errText}>{errors.contact}</Text> : null}
      </View>

      <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
        <Text style={s.submitBtnText}>{submitting ? 'Publishing…' : 'Publish Listing →'}</Text>
      </TouchableOpacity>
      {submitError ? <Text style={[s.errText, { textAlign: 'center' }]}>{submitError}</Text> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 56, gap: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  pageSub: { fontSize: 14, color: C.textMuted, lineHeight: 20 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, gap: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  cardHint: { fontSize: 12, color: C.textMuted },

  photoUpload: { borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed', borderRadius: 14, backgroundColor: C.primaryLight, paddingVertical: 32, alignItems: 'center', gap: 8 },
  photoUploadText: { fontSize: 14, fontWeight: '600', color: C.primary },
  photoUploadHint: { fontSize: 12, color: C.textMuted },

  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative', width: 80, height: 80 },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: C.border },
  thumbOverlay: { position: 'absolute', inset: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  thumbAdd: { width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed', backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', gap: 4 },
  thumbAddText: { fontSize: 11, fontWeight: '700', color: C.primary },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: C.text },
  inputErr: { borderColor: C.accent },
  textarea: { minHeight: 90 },
  errText: { fontSize: 12, color: C.accent, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12 },

  segmented: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  segBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  segBtnText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  segBtnTextActive: { color: C.primary },

  amenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  amenChipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  amenChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  amenChipTextActive: { color: C.primary },

  submitBtn: { backgroundColor: C.primary, paddingVertical: 16, borderRadius: 50, alignItems: 'center' },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 40, gap: 14 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 26, fontWeight: '800', color: C.text },
  successDesc: { fontSize: 15, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
  successBtn: { marginTop: 8, backgroundColor: C.primaryLight, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 50 },
  successBtnText: { color: C.primary, fontSize: 15, fontWeight: '700' },
});
