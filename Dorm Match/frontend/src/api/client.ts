import type { Contact, Review, Room } from '@/types';

function normalizeApiBase(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '');
  if (b.endsWith('/api')) {
    b = b.slice(0, -4).replace(/\/+$/, '');
  }
  return b;
}

const BASE = normalizeApiBase(process.env.EXPO_PUBLIC_API_URL || '');

export function isApiConfigured(): boolean {
  return BASE.length > 0;
}

function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  if (!isApiConfigured()) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }
  const { json, ...rest } = init || {};
  const res = await fetch(apiUrl(path), {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j && typeof j.error === 'string' && j.error.trim()) msg = j.error.trim();
    } catch {
      /* keep msg */
    }
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.trim().slice(0, 120);
    const looksHtml = snippet.startsWith('<') || snippet.toLowerCase().includes('<!doctype');
    throw new Error(
      looksHtml
        ? 'Server returned HTML instead of JSON — check EXPO_PUBLIC_API_URL points at your Flask API (not the Expo dev server).'
        : 'Invalid JSON response from API.'
    );
  }
}

export function fetchRooms(params: {
  type?: string;
  max_price?: number;
  q?: string;
  sort?: string;
  min_rating?: number;
  limit?: number;
  offset?: number;
}): Promise<Room[]> {
  const q = new URLSearchParams();
  if (params.type && params.type !== 'all') q.set('type', params.type);
  if (params.max_price !== undefined) q.set('max_price', String(params.max_price));
  if (params.q) q.set('q', params.q);
  if (params.sort) q.set('sort', params.sort);
  if (params.min_rating !== undefined) q.set('min_rating', String(params.min_rating));
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.offset !== undefined) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<Room[]>(`/api/rooms${qs ? `?${qs}` : ''}`);
}

export function fetchRoom(id: number): Promise<Room> {
  return apiFetch<Room>(`/api/rooms/${id}`);
}

export function fetchReviews(params: { room_id?: number; limit?: number; offset?: number }): Promise<Review[]> {
  const q = new URLSearchParams();
  if (params.room_id !== undefined) q.set('room_id', String(params.room_id));
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.offset !== undefined) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<Review[]>(`/api/reviews${qs ? `?${qs}` : ''}`);
}

export function fetchStats(): Promise<{ listingsCount: number; usersCount: number; avgRating: number }> {
  return apiFetch('/api/stats');
}

export function postRoom(body: Record<string, unknown>): Promise<Room> {
  return apiFetch<Room>('/api/rooms', { method: 'POST', json: body });
}

export function postReview(body: Record<string, unknown>): Promise<Review> {
  return apiFetch<Review>('/api/reviews', { method: 'POST', json: body });
}

export function postContactEvent(roomId: number, channel: 'call' | 'line'): Promise<void> {
  return apiFetch(`/api/rooms/${roomId}/contact-events`, {
    method: 'POST',
    json: { channel },
  });
}

export function authRegister(body: {
  email: string;
  password: string;
  display_name: string;
}): Promise<{ token: string; user: Record<string, unknown> }> {
  return apiFetch('/api/auth/register', { method: 'POST', json: body });
}

export function fetchMeListings(): Promise<Room[]> {
  return apiFetch<Room[]>('/api/me/listings');
}

export function fetchMeReviews(): Promise<Review[]> {
  return apiFetch<Review[]>('/api/me/reviews');
}

export function fetchMeContacts(): Promise<Contact[]> {
  return apiFetch<Contact[]>('/api/me/contacts');
}

export function authLogin(body: {
  email: string;
  password: string;
}): Promise<{ token: string; user: Record<string, unknown> }> {
  return apiFetch('/api/auth/login', { method: 'POST', json: body });
}

export async function uploadPhoto(asset: {
  uri: string;
  mimeType?: string;
  fileName?: string;
  file?: unknown;
}): Promise<string> {
  if (!isApiConfigured()) throw new Error('API not configured');
  const formData = new FormData();
  const webFile = asset.file as File | undefined;
  if (webFile) {
    formData.append('file', webFile);
  } else {
    const name = asset.fileName || `photo_${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    formData.append('file', { uri: asset.uri, name, type } as unknown as Blob);
  }
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(apiUrl('/api/uploads'), { method: 'POST', headers, body: formData });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try { const j = JSON.parse(text) as { error?: string }; if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return (JSON.parse(text) as { url: string }).url;
}

export function patchMe(body: {
  display_name?: string;
  line?: string;
  phone?: string;
}): Promise<{ id: number; display_name: string; email: string; avatar: string; line: string; phone: string }> {
  return apiFetch('/api/me', { method: 'PATCH', json: body });
}
