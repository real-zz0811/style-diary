import { useLocalStorage } from './useLocalStorage';
import type { Clothing, Outfit, Inspiration } from '../types';

const CLOTHING_KEY = 'style-diary-clothing';
const OUTFITS_KEY = 'style-diary-outfits';
const INSPIRATIONS_KEY = 'style-diary-inspirations';

export function useClothing() {
  return useLocalStorage<Clothing[]>(CLOTHING_KEY, []);
}

export function useOutfits() {
  return useLocalStorage<Outfit[]>(OUTFITS_KEY, []);
}

export function useInspirations() {
  return useLocalStorage<Inspiration[]>(INSPIRATIONS_KEY, []);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
