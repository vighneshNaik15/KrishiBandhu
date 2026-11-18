import { Timestamp } from 'firebase/firestore';

export type ProductCategory =
  | 'coconut_products'
  | 'fruits'
  | 'cashew'
  | 'kokum'
  | 'spices'
  | 'grains'
  | 'vegetables'
  | 'processed'
  | 'other';

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
  coconut_products: 'Coconut Products',
  fruits: 'Fruits',
  cashew: 'Cashew',
  kokum: 'Kokum',
  spices: 'Spices',
  grains: 'Grains',
  vegetables: 'Vegetables',
  processed: 'Processed Products',
  other: 'Other',
};

export interface Product {
  productId: string;

  // Farmer (denormalized for marketplace display)
  farmerId: string;
  farmerUserId: string;
  farmerName: string;
  farmerDistrict: string;
  farmerState: string;

  // Product details
  name: string;
  category: ProductCategory;
  description: string;

  // Pricing
  price: number;
  unit: string;
  minimumOrderQuantity: number;

  // Inventory
  quantityAvailable: number;

  // Location (denormalized from farmer)
  district: string;
  state: string;

  // Media
  images: string[];

  // Status
  status: ProductStatus;

  // Metadata
  tags?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateProductData {
  farmerId: string;
  farmerUserId: string;
  farmerName: string;
  farmerDistrict: string;
  farmerState: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  unit: string;
  minimumOrderQuantity: number;
  quantityAvailable: number;
  district: string;
  state: string;
  images: string[];
  tags?: string[];
}
