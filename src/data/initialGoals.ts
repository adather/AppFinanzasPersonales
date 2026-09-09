import { SavingsGoal } from '../types';

export function getInitialSavingsGoals(): SavingsGoal[] {
  return [
    {
      id: 'goal-1',
      title: 'Fondo de Emergencia (3 meses)',
      category: 'emergencia',
      targetAmount: 35000,
      currentAmount: 18500,
      targetDate: '2026-12-31',
      createdAt: '2026-06-01',
      color: '#10B981', // emerald
      notes: 'Colchón financiero de seguridad para contingencias médicas o laborales.',
      contributions: [
        { id: 'contrib-1', date: '2026-07-01', amount: 5000, note: 'Ahorro inicial de mitad de año' },
        { id: 'contrib-2', date: '2026-08-01', amount: 6500, note: 'Bono trimestral' },
        { id: 'contrib-3', date: '2026-09-01', amount: 7000, note: 'Aporte mensual disciplinado' },
      ],
      customAdvice: [
        {
          id: 'adv-1',
          focusCategory: 'Restaurantes & Cafeterías',
          monthlySavingPotential: 1200,
          tip: 'Aplica el "Efecto Sustitución": prepara café de especialidad en casa 3 de cada 4 viernes. Reducirás $1,200/mes sin privarte de la experiencia gourmet.',
          behavioralBias: 'Sesgo del Presente (Present Bias)',
          impactWeeksAccelerated: 3,
        },
        {
          id: 'adv-2',
          focusCategory: 'Otros & Microgastos',
          monthlySavingPotential: 600,
          tip: 'Activa la contabilidad mental inversa: transfiere automáticamente $150 cada lunes a tu subcuenta de emergencia.',
          behavioralBias: 'Contabilidad Mental (Mental Accounting)',
          impactWeeksAccelerated: 2,
        },
      ],
    },
    {
      id: 'goal-2',
      title: 'Pago Inicial para una Casa',
      category: 'vivienda',
      targetAmount: 180000,
      currentAmount: 52000,
      targetDate: '2028-06-30',
      createdAt: '2026-01-15',
      color: '#3B82F6', // blue
      notes: 'Enganche del 20% para crédito hipotecario.',
      contributions: [
        { id: 'contrib-4', date: '2026-02-15', amount: 20000, note: 'Aguinaldo y fondo anterior' },
        { id: 'contrib-5', date: '2026-05-30', amount: 16000, note: 'Reparto de utilidades' },
        { id: 'contrib-6', date: '2026-08-30', amount: 16000, note: 'Aportaciones acumuladas' },
      ],
      customAdvice: [
        {
          id: 'adv-3',
          focusCategory: 'Ropa & Compras',
          monthlySavingPotential: 1800,
          tip: 'Regla de enfriamiento de 72 horas para compras discrecionales mayores a $1,000. Evita compras impulsivas por euforia o falsos descuentos.',
          behavioralBias: 'Descuento Hiperbólico & Falso Ahorro',
          impactWeeksAccelerated: 7,
        },
        {
          id: 'adv-4',
          focusCategory: 'Entretenimiento & Suscripciones',
          monthlySavingPotential: 500,
          tip: 'Audita y rota servicios de streaming: mantén activa solo 1 plataforma por mes.',
          behavioralBias: 'Inercia del Statu Quo',
          impactWeeksAccelerated: 2,
        },
      ],
    },
    {
      id: 'goal-3',
      title: 'Vacaciones de Fin de Año',
      category: 'viajes',
      targetAmount: 22000,
      currentAmount: 12400,
      targetDate: '2026-12-15',
      createdAt: '2026-07-10',
      color: '#F59E0B', // amber
      notes: 'Vuelos y hospedaje para viaje familiar de diciembre.',
      contributions: [
        { id: 'contrib-7', date: '2026-07-15', amount: 4400, note: 'Depósito inicial' },
        { id: 'contrib-8', date: '2026-08-15', amount: 4000, note: 'Aporte de quincena' },
        { id: 'contrib-9', date: '2026-09-01', amount: 4000, note: 'Aporte de quincena' },
      ],
      customAdvice: [
        {
          id: 'adv-5',
          focusCategory: 'Restaurantes & Cafeterías',
          monthlySavingPotential: 950,
          tip: 'Establece un "fondo de salida semanal" en efectivo o tarjeta prepagada para los viernes. Cuando se acabe el saldo, termina el gasto social de ese día.',
          behavioralBias: 'Fricción de Pago (Pain of Paying)',
          impactWeeksAccelerated: 2,
        },
      ],
    },
  ];
}
