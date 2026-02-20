export enum BusinessCategory {
  CAFE = 'CAFE',
  BAR = 'BAR',
  RESTAURANT = 'RESTAURANT',
  KIOSK = 'KIOSK',
  GYM = 'GYM',
  HAIR_SALON = 'HAIR_SALON',
  PHARMACY = 'PHARMACY',
  PET_SHOP = 'PET_SHOP',
  LAUNDRY = 'LAUNDRY',
  ELECTRONICS_REPAIR = 'ELECTRONICS_REPAIR',
  BEAUTY_SALON = 'BEAUTY_SALON',
  DENTIST = 'DENTIST',
  SUPERMARKET = 'SUPERMARKET',
  CLOTHING = 'CLOTHING',
  BOOKSTORE = 'BOOKSTORE',
  CO_WORKING = 'CO_WORKING',
}

export type Verdict = 'OPEN' | 'OPEN_WITH_CONDITIONS' | 'DO_NOT_OPEN';

export type TicketBucket = 'low' | 'mid' | 'high';

export interface CategoryConfig {
  primaryTypes: string[];
  keyword?: string;
  isFood: boolean;
}

export const CATEGORY_CONFIG: Record<BusinessCategory, CategoryConfig> = {
  [BusinessCategory.CAFE]: {
    primaryTypes: ['cafe', 'bakery', 'meal_takeaway'],
    keyword: 'cafeteria',
    isFood: true,
  },
  [BusinessCategory.BAR]: {
    primaryTypes: ['bar'],
    isFood: true,
  },
  [BusinessCategory.RESTAURANT]: {
    primaryTypes: ['restaurant'],
    isFood: true,
  },
  [BusinessCategory.KIOSK]: {
    primaryTypes: ['convenience_store'],
    keyword: 'kiosco',
    isFood: false,
  },
  [BusinessCategory.GYM]: {
    primaryTypes: ['gym'],
    isFood: false,
  },
  [BusinessCategory.HAIR_SALON]: {
    primaryTypes: ['hair_salon'],
    isFood: false,
  },
  [BusinessCategory.PHARMACY]: {
    primaryTypes: ['pharmacy'],
    isFood: false,
  },
  [BusinessCategory.PET_SHOP]: {
    primaryTypes: ['pet_store'],
    isFood: false,
  },
  [BusinessCategory.LAUNDRY]: {
    primaryTypes: ['laundry'],
    isFood: false,
  },
  [BusinessCategory.ELECTRONICS_REPAIR]: {
    primaryTypes: ['electronics_store'],
    keyword: 'repair service',
    isFood: false,
  },
  [BusinessCategory.BEAUTY_SALON]: {
    primaryTypes: ['beauty_salon'],
    isFood: false,
  },
  [BusinessCategory.DENTIST]: {
    primaryTypes: ['dentist'],
    isFood: false,
  },
  [BusinessCategory.SUPERMARKET]: {
    primaryTypes: ['supermarket'],
    isFood: false,
  },
  [BusinessCategory.CLOTHING]: {
    primaryTypes: ['clothing_store'],
    isFood: false,
  },
  [BusinessCategory.BOOKSTORE]: {
    primaryTypes: ['book_store'],
    isFood: false,
  },
  [BusinessCategory.CO_WORKING]: {
    primaryTypes: ['establishment'],
    keyword: 'coworking',
    isFood: false,
  },
};

export function normalizeTicketBucket(
  avgTicket: string | number | undefined,
): TicketBucket | undefined {
  if (avgTicket === undefined || avgTicket === null) {
    return undefined;
  }

  if (typeof avgTicket === 'string') {
    const normalized = avgTicket.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'mid' || normalized === 'high') {
      return normalized;
    }

    return undefined;
  }

  if (avgTicket <= 7000) {
    return 'low';
  }

  if (avgTicket <= 15000) {
    return 'mid';
  }

  return 'high';
}
