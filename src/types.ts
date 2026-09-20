export type CategoryName =
  | 'Alimentos & Supermercado'
  | 'Transporte & Movilidad'
  | 'Entretenimiento & Ocio'
  | 'Servicios & Hogar'
  | 'Salud & Bienestar'
  | 'Educación & Libros'
  | 'Ropa & Compras'
  | 'Restaurantes & Cafeterías'
  | 'Otros';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  concept: string;
  merchant: string;
  amount: number;
  category: CategoryName;
  note?: string;
  isAnomaly?: boolean;
  zScore?: number;
  receiptImg?: string;
  rawSource?: 'manual' | 'receipt' | 'verbal' | 'seed';
}

export interface CategoryBudget {
  category: CategoryName;
  budget: number;
  color: string;
}

export interface CategoryStat {
  category: CategoryName;
  total: number;
  count: number;
  mean: number;
  stdDev: number;
  median: number;
  mad: number; // median absolute deviation of log(amount+1); unitless, not a dollar figure
  alertThreshold: number | null; // dollar amount that would flag as anomaly at the current sensitivity; null if too few transactions
  budget: number;
  budgetPercent: number;
  trend: '↑' | '↓' | '=';
  trendPercent: number;
  color: string;
}

export interface AnomalyItem {
  id: string;
  transaction: Transaction;
  zScore: number; // modified z-score (median/MAD, log-space) — robust to the outlier it's flagging
  categoryMedian: number;
  categoryMAD: number; // median absolute deviation of log(amount+1); unitless, not a dollar figure
  threshold: number;
  deviationMultiplier: number;
  explanation?: string;
}

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "05 sep"
  dailyTotal: number;
  cumulativeTotal: number;
  rollingAvg: number;
  count: number;
  hasAnomaly: boolean;
  anomalyZScore?: number;
  anomalyConcept?: string;
  anomalyAmount?: number;
  transactions: Transaction[];
}

export interface DayOfWeekSummary {
  day: string;
  count: number;
  total: number;
  avg: number;
  isSpike?: boolean;
}

export interface BehavioralPatterns {
  dayOfWeekSummary: DayOfWeekSummary[];
  fridaySpikePct: number;
  microExpensesCount: number;
  microExpensesTotal: number;
  weekendPct: number;
}

export interface SpendingRange {
  label: string;
  min: number;
  max: number;
  count: number;
  total: number;
  color: string;
}

export interface FinancialAnalysisResult {
  resumenEjecutivo: string[];
  tablaCategorias: {
    categoria: string;
    totalGastado: number;
    porcentajePresupuesto: number;
    tendencia: '↑' | '↓' | '=';
    comentarioConductual?: string;
  }[];
  topAnomalias: {
    concepto: string;
    monto: number;
    categoria: string;
    fecha: string;
    desviacionesEstandar: number;
    explicacion: string;
  }[];
  recomendacionesAhorro: {
    titulo: string;
    sesgoAbordado: string;
    accionConcreta: string;
    contextoEstadistico: string;
  }[];
  comparativaMesAnterior: {
    cambioTotalPorcentual: number;
    analisisComparativo: string;
    areasDeMejora: string[];
  };
  patronesProactivos: string[];
  generatedAt?: string;
  modelUsed?: string;
}

export type GeminiModelId =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-flash-latest'
  | 'gemini-3.1-pro-preview';

export interface GeminiModelOption {
  id: GeminiModelId;
  name: string;
  shortName: string;
  badge: string;
  speed: 'Ultra Rápido' | 'Rápido' | 'Profundo';
  description: string;
  details: string;
  isDefault?: boolean;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortName: '3.8 Flash',
    badge: 'Recomendado',
    speed: 'Rápido',
    description: 'Equilibrio óptimo entre velocidad y razonamiento estadístico avanzado.',
    details: 'Ideal para análisis general, detección de sesgos conductuales y categorización precisa.',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    shortName: '3.1 Lite',
    badge: 'Mínima Latencia',
    speed: 'Ultra Rápido',
    description: 'Procesamiento ultraligero y de respuesta casi instantánea.',
    details: 'Recomendado para captura por voz, OCR de tickets rápidos y consultas ligeras.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    shortName: 'Flash Latest',
    badge: 'Optimizado',
    speed: 'Rápido',
    description: 'Versión continua con los últimos refinamientos de inferencia rápida.',
    details: 'Ofrece alta precisión para auditoría de anomalías y desglose presupuestario.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    shortName: '3.1 Pro',
    badge: 'Razonamiento Profundo',
    speed: 'Profundo',
    description: 'Máxima potencia deductiva para auditoría financiera y proyecciones complejas.',
    details: 'Evalúa escenarios plurianuales de ahorro y dinámicas de economía conductual complejas.',
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  actionableData?: any;
}

export interface SavingsContribution {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface SavingsAdviceItem {
  id: string;
  focusCategory: string;
  monthlySavingPotential: number;
  tip: string;
  behavioralBias: string;
  impactWeeksAccelerated?: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  category: 'vivienda' | 'emergencia' | 'viajes' | 'educacion' | 'vehiculo' | 'tecnologia' | 'otro';
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
  notes?: string;
  color?: string;
  contributions?: SavingsContribution[];
  customAdvice?: SavingsAdviceItem[];
}
