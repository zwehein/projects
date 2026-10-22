import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { C } from '@/constants/colors';

export default function AuthGate({ message }: { message: string }) {
  const router = useRouter();
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Lock size={30} color={C.primary} />
      </View>
      <Text style={s.title}>Sign in required</Text>
      <Text style={s.sub}>{message}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.navigate('/(tabs)/profile' as never)}>
        <Text style={s.btnText}>Go to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
  btn: { marginTop: 8, backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
