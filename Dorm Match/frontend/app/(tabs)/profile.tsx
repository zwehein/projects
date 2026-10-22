import { useCallback, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LogOut, Edit3, Star, Home, MessageCircle, Shield, Phone, X } from 'lucide-react-native';
import { C } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import {
  authLogin,
  authRegister,
  fetchMeContacts,
  fetchMeListings,
  fetchMeReviews,
  isApiConfigured,
  patchMe,
} from '@/api/client';
import { REVIEWS, ROOMS } from '@/data/mockData';
import type { Contact, Review, Room } from '@/types';

const DUMMY_USER = { display_name: 'Admin', email: 'admin', avatar: 'AD' };

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase() || '?';
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={12} color={C.warning} fill={n <= Math.round(value) ? C.warning : 'transparent'} />
      ))}
    </View>
  );
}

type Tab = 'listings' | 'reviews' | 'contacts';

export default function ProfileScreen() {
  const useApi = isApiConfigured();
  const router = useRouter();
  const { loggedIn, user: profileUser, login, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('listings');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [myListings, setMyListings] = useState<Room[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [myContacts, setMyContacts] = useState<Contact[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLine, setEditLine] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const mockMyListings = ROOMS.slice(0, 2);
  const mockMyReviews = REVIEWS.slice(0, 2);
  const listingRows = useApi ? myListings : mockMyListings;
  const reviewRows = useApi ? myReviews : mockMyReviews;
  const contactRows = useApi ? myContacts : [];

  useFocusEffect(
    useCallback(() => {
      if (!loggedIn || !useApi) return;
      let cancelled = false;
      fetchMeListings()
        .then(rows => { if (!cancelled) setMyListings(rows); })
        .catch(() => { if (!cancelled) setMyListings([]); });
      fetchMeReviews()
        .then(rows => { if (!cancelled) setMyReviews(rows); })
        .catch(() => { if (!cancelled) setMyReviews([]); });
      fetchMeContacts()
        .then(rows => { if (!cancelled) setMyContacts(rows); })
        .catch(() => { if (!cancelled) setMyContacts([]); });
      return () => { cancelled = true; };
    }, [loggedIn, useApi]),
  );

  const submitAuth = async () => {
    setAuthError(null);

    // Dummy bypass — always works regardless of API state
    if (!isRegister && email.trim() === 'admin' && password === 'admin') {
      login(DUMMY_USER);
      return;
    }

    if (!useApi) {
      login({
        display_name: isRegister ? (registerName.trim() || 'Student') : 'Somsak T.',
        email: email.trim() || 'somsak.t@student.chula.ac.th',
        avatar: initials(isRegister ? registerName.trim() : 'Somsak T.'),
      });
      return;
    }

    if (isRegister) {
      if (!registerName.trim()) { setAuthError('Full name is required'); return; }
      if (password !== confirmPassword) { setAuthError('Passwords do not match'); return; }
    }

    setAuthBusy(true);
    try {
      const fn = isRegister
        ? authRegister({ email: email.trim().toLowerCase(), password, display_name: registerName.trim() })
        : authLogin({ email: email.trim().toLowerCase(), password });
      const { token, user } = await fn;
      const u = user as typeof DUMMY_USER & { avatar?: string };
      login({
        display_name: u.display_name,
        email: u.email,
        avatar: (u.avatar && u.avatar.trim()) || initials(u.display_name),
      }, token);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const openEdit = () => {
    setEditName(profileUser?.display_name ?? '');
    setEditLine('');
    setEditPhone('');
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) { setEditError('Name is required'); return; }
    setEditError(null);
    if (!useApi) {
      login({ ...profileUser!, display_name: editName.trim(), avatar: initials(editName.trim()) });
      setEditOpen(false);
      return;
    }
    setEditBusy(true);
    try {
      const body: Parameters<typeof patchMe>[0] = { display_name: editName.trim() };
      if (editLine.trim()) body.line = editLine.trim();
      if (editPhone.trim()) body.phone = editPhone.trim();
      const updated = await patchMe(body);
      login({
        ...profileUser!,
        display_name: updated.display_name,
        avatar: updated.avatar?.trim() || initials(updated.display_name),
      });
      setEditOpen(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditBusy(false);
    }
  };

  const signOut = () => {
    logout();
    setMyListings([]);
    setMyReviews([]);
    setMyContacts([]);
  };

  if (!loggedIn || !profileUser) {
    return (
      <View style={s.authPage}>
        <View style={s.authLogo}>
          <View style={s.logoCircle}><Text style={s.logoLetter}>D</Text></View>
          <Text style={s.logoTitle}>DormMatch</Text>
          <Text style={s.logoSub}>Dorm Room Finder & Roommate Matching</Text>
        </View>
        <View style={s.authCard}>
          <Text style={s.authCardTitle}>{isRegister ? 'Create Account' : 'Sign In'}</Text>
          {isRegister && (
            <TextInput
              style={s.authInput}
              placeholder="Full name"
              placeholderTextColor={C.textMuted}
              value={registerName}
              onChangeText={setRegisterName}
            />
          )}
          <TextInput style={s.authInput} placeholder="Email or username" placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={s.authInput} placeholder="Password" placeholderTextColor={C.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          {isRegister && (
            <TextInput
              style={s.authInput}
              placeholder="Confirm password"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          )}
          {authError ? <Text style={{ color: C.accent, fontSize: 13 }}>{authError}</Text> : null}
          <TouchableOpacity style={[s.authSubmit, authBusy && { opacity: 0.75 }]} onPress={submitAuth} disabled={authBusy}>
            <Text style={s.authSubmitText}>{authBusy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setIsRegister(v => !v); setAuthError(null); setConfirmPassword(''); }}>
            <Text style={s.authToggle}>
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pu = profileUser;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroAvatar}><Text style={s.heroAvatarText}>{pu.avatar}</Text></View>
        <View style={s.heroInfo}>
          <Text style={s.heroName}>{pu.display_name}</Text>
          <Text style={s.heroEmail}>{pu.email}</Text>
          <View style={s.heroBadges}>
            <View style={s.badge}><Shield size={11} color="rgba(255,255,255,0.9)" /><Text style={s.badgeText}>Verified Student</Text></View>
            <View style={[s.badge, s.badgePrimary]}><Star size={11} color="rgba(255,255,255,0.9)" /><Text style={s.badgeText}>4.8 rating</Text></View>
          </View>
        </View>
        <TouchableOpacity style={s.editBtn} onPress={openEdit}><Edit3 size={16} color={C.white} /></TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statNum}>{listingRows.length}</Text><Text style={s.statLabel}>My Listings</Text></View>
        <View style={s.statDiv} />
        <View style={s.stat}><Text style={s.statNum}>{reviewRows.length}</Text><Text style={s.statLabel}>Reviews Left</Text></View>
        <View style={s.statDiv} />
        <View style={s.stat}><Text style={s.statNum}>{contactRows.length}</Text><Text style={s.statLabel}>Contacts</Text></View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([['listings', Home, 'My Listings'], ['reviews', Star, 'My Reviews'], ['contacts', MessageCircle, 'Contacts']] as const).map(([key, Icon, label]) => (
          <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key)}>
            <Icon size={15} color={tab === key ? C.primary : C.textMuted} />
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={s.tabContent}>

        {tab === 'listings' && (
          listingRows.length === 0 ? (
            <View style={s.emptyTab}>
              <Home size={36} color={C.border} />
              <Text style={s.emptyTabText}>No listings yet. Post your first room!</Text>
            </View>
          ) : (
            listingRows.map(room => (
              <TouchableOpacity
                key={room.id}
                style={s.myListing}
                activeOpacity={0.8}
                onPress={() => router.push(`/listings/${room.id}` as never)}
              >
                {room.photos[0] ? (
                  <Image source={{ uri: room.photos[0] }} style={s.myListingImg} />
                ) : (
                  <View style={[s.myListingImg, s.myListingImgPlaceholder]}>
                    <Text style={{ fontSize: 10, color: C.textMuted }}>No photo</Text>
                  </View>
                )}
                <View style={s.myListingInfo}>
                  <Text style={s.myListingTitle} numberOfLines={2}>{room.title}</Text>
                  <Text style={s.myListingMeta}>฿{room.price.toLocaleString()}/mo · {room.type}</Text>
                  <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
                </View>
              </TouchableOpacity>
            ))
          )
        )}

        {tab === 'reviews' && (
          reviewRows.length === 0 ? (
            <View style={s.emptyTab}>
              <Star size={36} color={C.border} />
              <Text style={s.emptyTabText}>Your reviews will appear here.</Text>
            </View>
          ) : (
            reviewRows.map(rv => (
              <View key={rv.id} style={s.reviewCard}>
                <View style={s.reviewMeta}>
                  <Stars value={rv.rating} />
                  <Text style={s.reviewDate}>
                    {new Date(rv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {rv.roomId != null && (
                  <TouchableOpacity onPress={() => router.push(`/listings/${rv.roomId}` as never)}>
                    <View style={s.reviewRoomTag}>
                      <Text style={s.reviewRoomTagText}>Room #{rv.roomId}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <Text style={s.reviewComment}>{rv.comment}</Text>
              </View>
            ))
          )
        )}

        {tab === 'contacts' && (
          contactRows.length === 0 ? (
            <View style={s.emptyTab}>
              <MessageCircle size={36} color={C.border} />
              <Text style={s.emptyTabText}>Posters you've contacted will appear here.</Text>
            </View>
          ) : (
            contactRows.map(c => (
              <TouchableOpacity
                key={c.id}
                style={s.contactCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/listings/${c.roomId}` as never)}
              >
                <View style={[s.contactIcon, { backgroundColor: c.channel === 'call' ? C.primaryLight : '#D1FAE5' }]}>
                  {c.channel === 'call'
                    ? <Phone size={16} color={C.primary} />
                    : <MessageCircle size={16} color={C.success} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactRoomTitle} numberOfLines={1}>{c.roomTitle}</Text>
                  <Text style={s.contactMeta}>
                    {c.channel === 'call' ? 'Called' : 'Messaged on LINE'} · {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )
        )}

      </View>

      {/* Account */}
      <View style={s.accountCard}>
        <Text style={s.accountCardTitle}>Account</Text>
        {[
          ['University', 'Chulalongkorn University'],
          ['Member since', 'Jan 2026'],
        ].map(([label, value]) => (
          <View key={label} style={s.accountItem}>
            <Text style={s.accountItemLabel}>{label}</Text>
            <Text style={s.accountItemValue}>{value}</Text>
          </View>
        ))}
        <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
          <LogOut size={16} color={C.accent} />
          <Text style={s.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Edit profile modal */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditOpen(false)}>
          <TouchableOpacity style={s.modalSheet} activeOpacity={1}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <TouchableOpacity style={s.modalClose} onPress={() => setEditOpen(false)}>
                <X size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Display Name *</Text>
                <TextInput style={s.fieldInput} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={C.textMuted} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>LINE ID</Text>
                <TextInput style={s.fieldInput} value={editLine} onChangeText={setEditLine} placeholder="@your_line_id" placeholderTextColor={C.textMuted} autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Phone</Text>
                <TextInput style={s.fieldInput} value={editPhone} onChangeText={setEditPhone} placeholder="e.g. 081-234-5678" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
              </View>
              {editError ? <Text style={s.fieldError}>{editError}</Text> : null}
              <TouchableOpacity style={[s.saveBtn, editBusy && { opacity: 0.7 }]} onPress={saveEdit} disabled={editBusy}>
                <Text style={s.saveBtnText}>{editBusy ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  authPage: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  authLogo: { alignItems: 'center' },
  logoCircle: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoLetter: { color: C.white, fontSize: 34, fontWeight: '900' },
  logoTitle: { fontSize: 26, fontWeight: '900', color: C.primary },
  logoSub: { fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center' },
  authCard: { width: '100%', backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, gap: 12 },
  authCardTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  authInput: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: C.text },
  authSubmit: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 50, alignItems: 'center', marginTop: 4 },
  authSubmitText: { color: C.white, fontSize: 15, fontWeight: '700' },
  authToggle: { textAlign: 'center', color: C.primary, fontSize: 13, fontWeight: '600' },

  hero: { backgroundColor: C.primaryDark, padding: 24, paddingTop: 56, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  heroAvatarText: { color: C.white, fontSize: 20, fontWeight: '800' },
  heroInfo: { flex: 1 },
  heroName: { color: C.white, fontSize: 20, fontWeight: '800' },
  heroEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2, marginBottom: 10 },
  heroBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePrimary: { backgroundColor: 'rgba(255,255,255,0.28)' },
  badgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statDiv: { width: 1, height: 32, backgroundColor: C.border },

  tabs: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tabBtnTextActive: { color: C.primary },

  tabContent: { padding: 16, gap: 12 },

  myListing: { flexDirection: 'row', gap: 14, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  myListingImg: { width: 80, height: 64, borderRadius: 10 },
  myListingImgPlaceholder: { backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  myListingInfo: { flex: 1, gap: 4 },
  myListingTitle: { fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 18 },
  myListingMeta: { fontSize: 12, color: C.textMuted },
  activeBadge: { alignSelf: 'flex-start', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: C.success },

  reviewCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewDate: { fontSize: 11, color: C.textMuted },
  reviewRoomTag: { alignSelf: 'flex-start', backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  reviewRoomTagText: { fontSize: 11, fontWeight: '600', color: C.primary },
  reviewComment: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  contactCard: { flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contactRoomTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  contactMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  emptyTab: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTabText: { fontSize: 14, color: C.textMuted },

  accountCard: { margin: 20, backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
  accountCardTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  accountItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  accountItemLabel: { fontSize: 13, color: C.textMuted },
  accountItemValue: { fontSize: 13, fontWeight: '600', color: C.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5, borderColor: '#FEE2E2' },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: C.accent },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  modalBody: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  fieldInput: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: C.text },
  fieldError: { fontSize: 12, color: C.accent, fontWeight: '500' },
  saveBtn: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 50, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
});
