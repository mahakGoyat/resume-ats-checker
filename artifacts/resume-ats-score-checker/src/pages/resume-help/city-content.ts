import type { LandingData } from './templates';
import { CITY_PAGES_PART1 } from './city-content-part1';
import { CITY_PAGES_PART2 } from './city-content-part2';

export const CITY_NAME: Record<string, string> = {
  gurugram: 'Gurugram',
  faridabad: 'Faridabad',
  panchkula: 'Panchkula',
  ambala: 'Ambala',
  sonipat: 'Sonipat',
  hisar: 'Hisar',
  karnal: 'Karnal',
  rohtak: 'Rohtak',
  bahadurgarh: 'Bahadurgarh',
  'palwal-sohna': 'Palwal & Sohna',
};

export const CITY_ORDER: { slug: string; label: string; note: string }[] = [
  { slug: 'gurugram', label: 'Gurugram', note: 'NCR IT & corporate hub' },
  { slug: 'faridabad', label: 'Faridabad', note: 'Industrial & services' },
  { slug: 'panchkula', label: 'Panchkula', note: 'Tricity white-collar' },
  { slug: 'ambala', label: 'Ambala', note: 'Services & trade' },
  { slug: 'sonipat', label: 'Sonipat', note: 'Education & industry' },
  { slug: 'hisar', label: 'Hisar', note: 'Agri-industrial' },
  { slug: 'karnal', label: 'Karnal', note: 'Government & research' },
  { slug: 'rohtak', label: 'Rohtak', note: 'Admin & freshers' },
  { slug: 'bahadurgarh', label: 'Bahadurgarh', note: 'Delhi-border industry' },
  { slug: 'palwal-sohna', label: 'Palwal & Sohna', note: 'Faridabad–Gurugram corridor' },
];

export const CITY_PAGES: Record<string, LandingData> = {
  ...CITY_PAGES_PART1,
  ...CITY_PAGES_PART2,
};