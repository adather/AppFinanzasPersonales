import { Transaction } from '../types';

export function getInitialTransactions(): { current: Transaction[]; previous: Transaction[] } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Transactions for the current month
  const current: Transaction[] = [
    // Alimentos & Supermercado
    { id: 'c-1', date: `${year}-${pad(month)}-02`, concept: 'Compra semanal de despensa', merchant: 'Walmart Supercenter', amount: 1650, category: 'Alimentos & Supermercado', rawSource: 'seed' },
    { id: 'c-2', date: `${year}-${pad(month)}-08`, concept: 'Frutas, verduras y carnicería', merchant: 'Mercado Local', amount: 820, category: 'Alimentos & Supermercado', rawSource: 'seed' },
    { id: 'c-3', date: `${year}-${pad(month)}-15`, concept: 'Despensa quincenal completa', merchant: 'Costco Wholesale', amount: 2450, category: 'Alimentos & Supermercado', rawSource: 'seed' },
    { id: 'c-4', date: `${year}-${pad(month)}-22`, concept: 'Abarrotes y lácteos', merchant: 'Superama', amount: 980, category: 'Alimentos & Supermercado', rawSource: 'seed' },
    { id: 'c-5', date: `${year}-${pad(month)}-26`, concept: 'Snacks y despensa express', merchant: 'Oxxo', amount: 280, category: 'Alimentos & Supermercado', rawSource: 'seed' },

    // Transporte & Movilidad
    { id: 'c-6', date: `${year}-${pad(month)}-03`, concept: 'Carga de gasolina magna', merchant: 'Gasolinera Pemex', amount: 750, category: 'Transporte & Movilidad', rawSource: 'seed' },
    { id: 'c-7', date: `${year}-${pad(month)}-10`, concept: 'Carga de gasolina magna', merchant: 'Gasolinera Shell', amount: 800, category: 'Transporte & Movilidad', rawSource: 'seed' },
    { id: 'c-8', date: `${year}-${pad(month)}-17`, concept: 'Viaje Uber reunión oficina', merchant: 'Uber Technologies', amount: 145, category: 'Transporte & Movilidad', rawSource: 'seed' },
    { id: 'c-9', date: `${year}-${pad(month)}-20`, concept: 'Recarga tarjeta Metro / Metrobús', merchant: 'Movilidad Integrada', amount: 200, category: 'Transporte & Movilidad', rawSource: 'seed' },
    { id: 'c-10', date: `${year}-${pad(month)}-24`, concept: 'Carga de gasolina magna', merchant: 'Gasolinera BP', amount: 780, category: 'Transporte & Movilidad', rawSource: 'seed' },

    // Restaurantes & Cafeterías (With Friday coffee pattern!)
    { id: 'c-11', date: `${year}-${pad(month)}-05`, concept: 'Café latte y croissant (Viernes)', merchant: 'Starbucks Coffee', amount: 165, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-12', date: `${year}-${pad(month)}-06`, concept: 'Cena con amigos sábado', merchant: 'Pizzería Artesanal', amount: 480, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-13', date: `${year}-${pad(month)}-12`, concept: 'Café de especialidad y postre (Viernes)', merchant: 'Café Cielito', amount: 195, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-14', date: `${year}-${pad(month)}-14`, concept: 'Almuerzo ejecutivo menú del día', merchant: 'Bistró Central', amount: 220, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-15', date: `${year}-${pad(month)}-19`, concept: 'Café cold brew doble (Viernes)', merchant: 'Starbucks Coffee', amount: 175, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-16', date: `${year}-${pad(month)}-21`, concept: 'Comida dominical familiar', merchant: 'Restaurante El Rincón', amount: 650, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-17', date: `${year}-${pad(month)}-26`, concept: 'Café gourmet y matcha (Viernes)', merchant: 'Cafetería Rosetta', amount: 210, category: 'Restaurantes & Cafeterías', rawSource: 'seed' },
    { id: 'c-18', date: `${year}-${pad(month)}-27`, concept: 'Cena de celebración de fin de mes', merchant: 'Restaurante Pujol Bistro', amount: 1850, category: 'Restaurantes & Cafeterías', note: 'Salida especial', rawSource: 'seed' },

    // Servicios & Hogar
    { id: 'c-19', date: `${year}-${pad(month)}-04`, concept: 'Internet de fibra óptica y telefonía', merchant: 'Totalplay', amount: 699, category: 'Servicios & Hogar', rawSource: 'seed' },
    { id: 'c-20', date: `${year}-${pad(month)}-05`, concept: 'Servicio de energía eléctrica bimestral', merchant: 'CFE Suministrador', amount: 840, category: 'Servicios & Hogar', rawSource: 'seed' },
    { id: 'c-21', date: `${year}-${pad(month)}-15`, concept: 'Mantenimiento de edificio', merchant: 'Administración Condominal', amount: 1200, category: 'Servicios & Hogar', rawSource: 'seed' },
    { id: 'c-22', date: `${year}-${pad(month)}-18`, concept: 'Servicio de agua potable', merchant: 'Sacmex', amount: 320, category: 'Servicios & Hogar', rawSource: 'seed' },

    // Entretenimiento & Ocio
    { id: 'c-23', date: `${year}-${pad(month)}-07`, concept: 'Suscripción mensual Netflix & Spotify', merchant: 'Netflix/Spotify', amount: 379, category: 'Entretenimiento & Ocio', rawSource: 'seed' },
    { id: 'c-24', date: `${year}-${pad(month)}-13`, concept: 'Entradas de cine y palomitas', merchant: 'Cinépolis VIP', amount: 460, category: 'Entretenimiento & Ocio', rawSource: 'seed' },
    { id: 'c-25', date: `${year}-${pad(month)}-20`, concept: 'Videojuego en oferta Steam', merchant: 'Steam Games', amount: 420, category: 'Entretenimiento & Ocio', rawSource: 'seed' },

    // Salud & Bienestar
    { id: 'c-26', date: `${year}-${pad(month)}-09`, concept: 'Membresía gimnasio mensual', merchant: 'Smart Fit', amount: 599, category: 'Salud & Bienestar', rawSource: 'seed' },
    { id: 'c-27', date: `${year}-${pad(month)}-16`, concept: 'Vitaminas y suplementos', merchant: 'Farmacia San Pablo', amount: 450, category: 'Salud & Bienestar', rawSource: 'seed' },

    // Ropa & Compras (INCLUDES A STATISTICAL ANOMALY > 2 std dev)
    { id: 'c-28', date: `${year}-${pad(month)}-11`, concept: 'Camisa formal y calcetines', merchant: 'Zara Men', amount: 699, category: 'Ropa & Compras', rawSource: 'seed' },
    { id: 'c-29', date: `${year}-${pad(month)}-18`, concept: 'Playeras básicas algodón', merchant: 'H&M', amount: 450, category: 'Ropa & Compras', rawSource: 'seed' },
    // STATISTICAL ANOMALY 1: Impulsive Luxury Purchase (Z-score > 2.8)
    { id: 'c-30', date: `${year}-${pad(month)}-23`, concept: 'Abrigo de diseñador y botas de piel', merchant: 'Palacio de Hierro', amount: 3850, category: 'Ropa & Compras', note: 'Compra no planificada con descuento aparente (anomalía >2 std dev)', rawSource: 'seed' },

    // Otros / Imprevistos (INCLUDES ANOTHER STATISTICAL ANOMALY)
    { id: 'c-31', date: `${year}-${pad(month)}-14`, concept: 'Artículos de papelería para oficina', merchant: 'Office Depot', amount: 320, category: 'Otros', rawSource: 'seed' },
    { id: 'c-32', date: `${year}-${pad(month)}-25`, concept: 'Regalo cumpleaños colega', merchant: 'Amazon México', amount: 450, category: 'Otros', rawSource: 'seed' },
    // STATISTICAL ANOMALY 2: Mechanical Emergency Repair (Z-score > 3.0)
    { id: 'c-33', date: `${year}-${pad(month)}-28`, concept: 'Reparación imprevista de frenos y suspensión del auto', merchant: 'Taller Mecánico Especializado', amount: 4600, category: 'Otros', note: 'Gasto extraordinario fuera del promedio histórico', rawSource: 'seed' },
  ];

  // Transactions for previous month (for statistical comparison & trend analysis)
  const previous: Transaction[] = [
    { id: 'p-1', date: `${prevYear}-${pad(prevMonth)}-03`, concept: 'Despensa mensual parte 1', merchant: 'Walmart', amount: 1550, category: 'Alimentos & Supermercado' },
    { id: 'p-2', date: `${prevYear}-${pad(prevMonth)}-10`, concept: 'Frutas y verduras frescas', merchant: 'Mercado Local', amount: 750, category: 'Alimentos & Supermercado' },
    { id: 'p-3', date: `${prevYear}-${pad(prevMonth)}-16`, concept: 'Despensa quincenal Costco', merchant: 'Costco', amount: 2300, category: 'Alimentos & Supermercado' },
    { id: 'p-4', date: `${prevYear}-${pad(prevMonth)}-24`, concept: 'Supermercado express', merchant: 'Chedraui', amount: 890, category: 'Alimentos & Supermercado' },
    { id: 'p-5', date: `${prevYear}-${pad(prevMonth)}-04`, concept: 'Gasolina', merchant: 'Pemex', amount: 750, category: 'Transporte & Movilidad' },
    { id: 'p-6', date: `${prevYear}-${pad(prevMonth)}-12`, concept: 'Gasolina', merchant: 'BP', amount: 750, category: 'Transporte & Movilidad' },
    { id: 'p-7', date: `${prevYear}-${pad(prevMonth)}-20`, concept: 'Gasolina', merchant: 'Shell', amount: 750, category: 'Transporte & Movilidad' },
    { id: 'p-8', date: `${prevYear}-${pad(prevMonth)}-06`, concept: 'Café y comida de trabajo', merchant: 'Starbucks', amount: 140, category: 'Restaurantes & Cafeterías' },
    { id: 'p-9', date: `${prevYear}-${pad(prevMonth)}-13`, concept: 'Restaurante con amigos', merchant: 'Taquería La Onda', amount: 380, category: 'Restaurantes & Cafeterías' },
    { id: 'p-10', date: `${prevYear}-${pad(prevMonth)}-20`, concept: 'Cafetería viernes', merchant: 'Starbucks', amount: 150, category: 'Restaurantes & Cafeterías' },
    { id: 'p-11', date: `${prevYear}-${pad(prevMonth)}-27`, concept: 'Almuerzo fin de semana', merchant: 'Trattoria Italiana', amount: 620, category: 'Restaurantes & Cafeterías' },
    { id: 'p-12', date: `${prevYear}-${pad(prevMonth)}-05`, concept: 'Internet Totalplay', merchant: 'Totalplay', amount: 699, category: 'Servicios & Hogar' },
    { id: 'p-13', date: `${prevYear}-${pad(prevMonth)}-15`, concept: 'Mantenimiento edificio', merchant: 'Condominio', amount: 1200, category: 'Servicios & Hogar' },
    { id: 'p-14', date: `${prevYear}-${pad(prevMonth)}-08`, concept: 'Netflix & Spotify', merchant: 'Streaming', amount: 379, category: 'Entretenimiento & Ocio' },
    { id: 'p-15', date: `${prevYear}-${pad(prevMonth)}-18`, concept: 'Salida al teatro', merchant: 'Ticketmaster', amount: 950, category: 'Entretenimiento & Ocio' },
    { id: 'p-16', date: `${prevYear}-${pad(prevMonth)}-10`, concept: 'Membresía gimnasio', merchant: 'Smart Fit', amount: 599, category: 'Salud & Bienestar' },
    { id: 'p-17', date: `${prevYear}-${pad(prevMonth)}-12`, concept: 'Pantalón mezclilla', merchant: 'Levi\'s', amount: 890, category: 'Ropa & Compras' },
    { id: 'p-18', date: `${prevYear}-${pad(prevMonth)}-22`, concept: 'Camisa casual', merchant: 'Pull & Bear', amount: 490, category: 'Ropa & Compras' },
    { id: 'p-19', date: `${prevYear}-${pad(prevMonth)}-17`, concept: 'Limpieza y varios', merchant: 'Miniso', amount: 350, category: 'Otros' },
  ];

  return { current, previous };
}
