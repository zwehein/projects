export type RoomType = 'studio' | 'single' | 'shared';

export interface Poster {
  name: string;
  line: string;
  phone: string;
  avatar: string;
}

export interface Room {
  id: number;
  title: string;
  type: RoomType;
  price: number;
  location: string;
  distance: string;
  available: string;
  photos: string[];
  amenities: string[];
  poster: Poster;
  rating: number;
  reviews: number;
  description: string;
}

export interface Review {
  id: number;
  roomId: number | null;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  type?: string;
  isNew?: boolean;
}

export interface Contact {
  id: number;
  roomId: number;
  channel: 'call' | 'line';
  createdAt: string;
  roomTitle: string;
  roomLocation: string;
}
