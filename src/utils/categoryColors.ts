import { CategoryName } from '../types';

// Display-only color lookup (UI concern, not statistics) — kept in TS. The
// backend has its own copy for the colors it attaches to computed category
// stats; this one is for places that only have a category name (e.g. a
// per-transaction badge) and no stats object to read `.color` from.
export const CATEGORY_COLORS: Record<CategoryName, string> = {
  'Alimentos & Supermercado': '#10B981', // Emerald
  'Transporte & Movilidad': '#3B82F6', // Blue
  'Entretenimiento & Ocio': '#EC4899', // Pink
  'Servicios & Hogar': '#8B5CF6', // Purple
  'Salud & Bienestar': '#14B8A6', // Teal
  'Educación & Libros': '#F59E0B', // Amber
  'Ropa & Compras': '#F97316', // Orange
  'Restaurantes & Cafeterías': '#EF4444', // Red
  'Otros': '#6B7280', // Gray
};
