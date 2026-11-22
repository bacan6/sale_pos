export interface Product {
  id: string;
  name: string;
  code: string;
  category: 'Coffee' | 'Non-Coffee' | 'Snacks' | 'Heavy Meal' | 'Dessert';
  price: number;
  cost: number;
  stock: number;
  isAvailable: boolean;
  image: string;
  description?: string;
  options?: {
    name: string;
    choices: string[];
  }[];
}

export interface TableItem {
  id: string;
  name: string;
  capacity: number;
  zone: 'Indoor' | 'Outdoor' | 'VIP Area';
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  activeOrderNumber?: string;
  activeOrderTotal?: number;
  guestCount?: number;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  notes?: string;
  selectedOptions?: Record<string, string>;
}

export interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableNumber: string;
  type: 'Dine-In' | 'Take-Away';
  waiterName: string;
  createdAt: string;
  status: 'queued' | 'cooking' | 'ready';
  notes?: string;
  items: {
    name: string;
    qty: number;
    notes?: string;
    options?: string[];
  }[];
}

export const CATEGORIES = [
  'All',
  'Coffee',
  'Non-Coffee',
  'Snacks',
  'Heavy Meal',
  'Dessert',
] as const;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Espresso Single',
    code: 'CF-001',
    category: 'Coffee',
    price: 18000,
    cost: 5000,
    stock: 99,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80',
    description: 'Single shot rich extraction 100% Arabica beans.',
  },
  {
    id: 'p2',
    name: 'Cafe Latte',
    code: 'CF-002',
    category: 'Coffee',
    price: 28000,
    cost: 8000,
    stock: 50,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&auto=format&fit=crop&q=80',
    description: 'Smooth espresso with velvety steamed fresh milk.',
    options: [
      { name: 'Sugar', choices: ['Normal', 'Less Sugar', 'No Sugar'] },
      { name: 'Milk', choices: ['Fresh Milk', 'Oatmilk (+6k)', 'Almond Milk (+8k)'] }
    ]
  },
  {
    id: 'p3',
    name: 'Caramel Macchiato',
    code: 'CF-003',
    category: 'Coffee',
    price: 32000,
    cost: 10000,
    stock: 42,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop&q=80',
    description: 'Espresso layered with vanilla syrup and caramel drizzle.',
    options: [
      { name: 'Temperature', choices: ['Iced', 'Hot'] },
      { name: 'Sugar', choices: ['Normal', 'Less Sugar'] }
    ]
  },
  {
    id: 'p4',
    name: 'Matcha Green Tea Latte',
    code: 'NC-001',
    category: 'Non-Coffee',
    price: 30000,
    cost: 9000,
    stock: 35,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
    description: 'Pure Uji matcha powder blended with creamy milk.',
    options: [
      { name: 'Temperature', choices: ['Iced', 'Hot'] }
    ]
  },
  {
    id: 'p5',
    name: 'Signature Ice Chocolate',
    code: 'NC-002',
    category: 'Non-Coffee',
    price: 28000,
    cost: 8500,
    stock: 40,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80',
    description: 'Belgian dark chocolate ganache with chilled milk.',
  },
  {
    id: 'p6',
    name: 'French Fries Truffle Mayo',
    code: 'SN-001',
    category: 'Snacks',
    price: 25000,
    cost: 7000,
    stock: 60,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=80',
    description: 'Crispy straight-cut potatoes with truffle mayo dip.',
  },
  {
    id: 'p7',
    name: 'Nasi Goreng Kampung',
    code: 'HM-001',
    category: 'Heavy Meal',
    price: 38000,
    cost: 14000,
    stock: 25,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop&q=80',
    description: 'Traditional fried rice served with fried egg, satay, and crackers.',
    options: [
      { name: 'Spicy Level', choices: ['Tidak Pedas', 'Sedang', 'Pedas Banget'] }
    ]
  },
  {
    id: 'p8',
    name: 'Spaghetti Aglio Olio Smoked Beef',
    code: 'HM-002',
    category: 'Heavy Meal',
    price: 42000,
    cost: 16000,
    stock: 20,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80',
    description: 'Al dente spaghetti tossed with olive oil, garlic, chili flakes, and smoked beef.',
  },
  {
    id: 'p9',
    name: 'Croissant Butter Original',
    code: 'DS-001',
    category: 'Dessert',
    price: 22000,
    cost: 8000,
    stock: 15,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
    description: 'Flaky and buttery French laminated pastry baked fresh daily.',
  }
];

export const INITIAL_TABLES: TableItem[] = [
  { id: 't1', name: 'Meja 01', capacity: 2, zone: 'Indoor', status: 'occupied', activeOrderNumber: '#ORD-108', activeOrderTotal: 84000, guestCount: 2 },
  { id: 't2', name: 'Meja 02', capacity: 4, zone: 'Indoor', status: 'available' },
  { id: 't3', name: 'Meja 03', capacity: 4, zone: 'Indoor', status: 'billing', activeOrderNumber: '#ORD-105', activeOrderTotal: 142000, guestCount: 3 },
  { id: 't4', name: 'Meja 04', capacity: 6, zone: 'Indoor', status: 'reserved', guestCount: 5 },
  { id: 't5', name: 'Meja 05', capacity: 2, zone: 'Outdoor', status: 'occupied', activeOrderNumber: '#ORD-109', activeOrderTotal: 56000, guestCount: 1 },
  { id: 't6', name: 'Meja 06', capacity: 4, zone: 'Outdoor', status: 'available' },
  { id: 't7', name: 'Meja 07', capacity: 4, zone: 'Outdoor', status: 'available' },
  { id: 't8', name: 'VIP 01', capacity: 10, zone: 'VIP Area', status: 'reserved', guestCount: 8 },
  { id: 't9', name: 'VIP 02', capacity: 8, zone: 'VIP Area', status: 'available' },
];

export const INITIAL_KITCHEN_TICKETS: KitchenTicket[] = [
  {
    id: 'k1',
    orderNumber: 'ORD-108',
    tableNumber: 'Meja 01',
    type: 'Dine-In',
    waiterName: 'Andi (Pramuniaga)',
    createdAt: '14:20:15',
    status: 'cooking',
    items: [
      { name: 'Nasi Goreng Kampung', qty: 1, notes: 'Pedas Banget, Telur setengah matang' },
      { name: 'French Fries Truffle Mayo', qty: 1, notes: 'Saus dipisah' },
      { name: 'Cafe Latte', qty: 2, options: ['Less Sugar', 'Fresh Milk'] }
    ]
  },
  {
    id: 'k2',
    orderNumber: 'ORD-109',
    tableNumber: 'Meja 05',
    type: 'Dine-In',
    waiterName: 'Self-Order (Pelanggan)',
    createdAt: '14:26:40',
    status: 'queued',
    notes: 'Segera disajikan setelah selesai',
    items: [
      { name: 'Caramel Macchiato', qty: 1, options: ['Iced', 'Less Sugar'] },
      { name: 'Croissant Butter Original', qty: 1, notes: 'Dipanaskan sebentar (warm up)' }
    ]
  },
  {
    id: 'k3',
    orderNumber: 'ORD-107',
    tableNumber: 'Take-Away #03',
    type: 'Take-Away',
    waiterName: 'Budi (Kasir)',
    createdAt: '14:10:02',
    status: 'ready',
    items: [
      { name: 'Signature Ice Chocolate', qty: 2 },
      { name: 'Spaghetti Aglio Olio Smoked Beef', qty: 1, notes: 'Packaging box take-away' }
    ]
  }
];

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};
