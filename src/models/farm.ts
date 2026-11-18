import { Timestamp, GeoPoint } from 'firebase/firestore';

export type SoilType =
  | 'laterite'
  | 'alluvial'
  | 'clay'
  | 'sandy'
  | 'loamy'
  | 'red'
  | 'other';

export type IrrigationType =
  | 'rain_fed'
  | 'drip'
  | 'sprinkler'
  | 'flood'
  | 'canal'
  | 'well'
  | 'borewell'
  | 'other';

export type AreaUnit = 'acres' | 'hectares' | 'guntha' | 'sqft';

export interface Farm {
  farmId: string;
  farmerId: string;      // farmerProfile doc ID
  farmerUserId: string;  // Firebase Auth UID

  // Identity
  name: string;
  description?: string;

  // Location
  village?: string;
  taluka?: string;
  district: string;
  state: string;
  pincode?: string;
  coordinates?: GeoPoint;

  // Farm details
  area: number;
  areaUnit: AreaUnit;
  soilType?: SoilType;
  irrigationType?: IrrigationType;

  // Images
  images: string[];  // Firebase Storage URLs

  // Status
  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateFarmData {
  farmerId: string;
  farmerUserId: string;
  name: string;
  description?: string;
  village?: string;
  taluka?: string;
  district: string;
  state: string;
  pincode?: string;
  coordinates?: GeoPoint;
  area: number;
  areaUnit: AreaUnit;
  soilType?: SoilType;
  irrigationType?: IrrigationType;
}

export const SOIL_TYPE_LABELS: Record<SoilType, string> = {
  laterite: 'Laterite (Jambha)',
  alluvial: 'Alluvial',
  clay: 'Clay',
  sandy: 'Sandy',
  loamy: 'Loamy',
  red: 'Red Soil',
  other: 'Other',
};

export const IRRIGATION_TYPE_LABELS: Record<IrrigationType, string> = {
  rain_fed: 'Rain-fed',
  drip: 'Drip Irrigation',
  sprinkler: 'Sprinkler',
  flood: 'Flood / Surface',
  canal: 'Canal',
  well: 'Open Well',
  borewell: 'Borewell',
  other: 'Other',
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  acres: 'Acres',
  hectares: 'Hectares',
  guntha: 'Guntha',
  sqft: 'Sq. Feet',
};
