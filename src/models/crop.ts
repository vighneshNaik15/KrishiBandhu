import { Timestamp } from 'firebase/firestore';

export type CropSeason = 'kharif' | 'rabi' | 'zaid' | 'perennial' | 'year_round';

export type CropGrowthStage =
  | 'land_preparation'
  | 'sowing'
  | 'germination'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'maturity'
  | 'harvesting'
  | 'post_harvest';

export type CropCategory =
  | 'coconut'
  | 'arecanut'
  | 'cashew'
  | 'mango'
  | 'kokum'
  | 'spices'
  | 'vegetables'
  | 'grains'
  | 'pulses'
  | 'fruits'
  | 'plantation'
  | 'other';

export interface Crop {
  cropId: string;
  farmId: string;
  farmerId: string;
  farmerUserId: string;

  // Identity
  name: string;
  localName?: string;
  category: CropCategory;
  variety?: string;

  // Season and timing
  season: CropSeason;
  sowingDate?: Timestamp;
  expectedHarvestDate?: Timestamp;
  actualHarvestDate?: Timestamp;

  // Area
  cultivatedArea: number;
  areaUnit: string;

  // Growth
  currentGrowthStage: CropGrowthStage;

  // Inputs
  irrigationDetails?: string;
  fertilizerDetails?: string;
  pestManagementDetails?: string;

  // Status
  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCropData {
  farmId: string;
  farmerId: string;
  farmerUserId: string;
  name: string;
  localName?: string;
  category: CropCategory;
  variety?: string;
  season: CropSeason;
  sowingDate?: Date;
  expectedHarvestDate?: Date;
  cultivatedArea: number;
  areaUnit: string;
  currentGrowthStage: CropGrowthStage;
  irrigationDetails?: string;
  fertilizerDetails?: string;
  pestManagementDetails?: string;
}

export const CROP_SEASON_LABELS: Record<CropSeason, string> = {
  kharif: 'Kharif (Monsoon)',
  rabi: 'Rabi (Winter)',
  zaid: 'Zaid (Summer)',
  perennial: 'Perennial',
  year_round: 'Year-round',
};

export const CROP_GROWTH_STAGE_LABELS: Record<CropGrowthStage, string> = {
  land_preparation: 'Land Preparation',
  sowing: 'Sowing / Planting',
  germination: 'Germination',
  vegetative: 'Vegetative Growth',
  flowering: 'Flowering',
  fruiting: 'Fruiting',
  maturity: 'Maturity',
  harvesting: 'Harvesting',
  post_harvest: 'Post-Harvest',
};

export const CROP_CATEGORY_LABELS: Record<CropCategory, string> = {
  coconut: 'Coconut',
  arecanut: 'Areca Nut',
  cashew: 'Cashew',
  mango: 'Mango',
  kokum: 'Kokum',
  spices: 'Spices',
  vegetables: 'Vegetables',
  grains: 'Grains & Cereals',
  pulses: 'Pulses',
  fruits: 'Other Fruits',
  plantation: 'Plantation Crops',
  other: 'Other',
};
