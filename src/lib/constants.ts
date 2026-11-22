// App-wide constants for the KrishiBandhu platform

export const APP_NAME = 'KrishiBandhu';
export const APP_TAGLINE = 'Your Trusted Partner in Agriculture';
export const APP_DESCRIPTION =
  'KrishiBandhu connects farmers, agricultural workers, buyers and farm service providers through farm management, crop intelligence, labour discovery and agricultural commerce.';

// Geographic focus
export const KONKAN_STATES = ['Maharashtra', 'Goa'] as const;

export const KONKAN_DISTRICTS: Record<string, string[]> = {
  Maharashtra: [
    'Raigad', 'Ratnagiri', 'Sindhudurg', 'Thane',
    'Mumbai City', 'Mumbai Suburban', 'Palghar',
  ],
  Goa: ['North Goa', 'South Goa'],
};

// All Indian states (for address forms)
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

// Product units
export const PRODUCT_UNITS = [
  'kg', 'gram', 'litre', 'ml', 'piece', 'dozen', 'box', 'bundle', 'packet', 'quintal',
] as const;

// Upload limits
export const MAX_PRODUCT_IMAGES = 5;
export const MAX_FARM_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Pagination
export const PRODUCTS_PER_PAGE = 12;
export const JOBS_PER_PAGE = 20;
export const ORDERS_PER_PAGE = 20;

// Firebase collection names
export const COLLECTIONS = {
  USERS: 'users',
  FARMER_PROFILES: 'farmerProfiles',
  WORKER_PROFILES: 'workerProfiles',
  BUYER_PROFILES: 'buyerProfiles',
  FARMS: 'farms',
  CROPS: 'crops',
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'jobApplications',
  SERVICE_LISTINGS: 'serviceListings',
  STORAGE_FACILITIES: 'storageFacilities',
  STORAGE_ENQUIRIES: 'storageEnquiries',
  MARKET_YARDS: 'marketYards',
  POST_HARVEST_GUIDES: 'postHarvestGuides',
  PRODUCTS: 'products',
  PRODUCT_ENQUIRIES: 'productEnquiries',
  ORDERS: 'orders',
  CROP_DISEASE_ANALYSES: 'cropDiseaseAnalyses',
  SCHEMES: 'schemes',
  TRANSACTIONS: 'transactions',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  ADMIN_LOGS: 'adminLogs',
  // Legacy — keep for backward compat
  FARMERS: 'farmers',
} as const;

// Routes
export const ROUTES = {
  // Public
  HOME: '/',
  MARKETPLACE: '/marketplace',
  JOBS: '/jobs',
  MARKET_FINDER: '/market-finder',
  STORAGE_FINDER: '/storage-finder',
  HARVEST_SERVICES: '/harvest-services',
  ABOUT: '/#about',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_FARMER: '/register/farmer',
  REGISTER_WORKER: '/register/worker',
  REGISTER_BUYER: '/register/buyer',
  FORGOT_PASSWORD: '/forgot-password',

  // Farmer
  FARMER_DASHBOARD: '/farmer',
  FARMER_PROFILE: '/farmer/profile',
  FARMER_FARMS: '/farmer/farms',
  FARMER_FARMS_NEW: '/farmer/farms/new',
  FARMER_CROPS: '/farmer/crops',
  FARMER_CROPS_NEW: '/farmer/crops/new',
  FARMER_JOBS: '/farmer/jobs',
  FARMER_JOBS_NEW: '/farmer/jobs/new',
  FARMER_HARVEST_REQUESTS: '/farmer/harvest-requests',
  FARMER_HARVEST_REQUEST_NEW: '/farmer/harvest-requests/new',
  FARMER_PRODUCTS: '/farmer/products',
  FARMER_PRODUCTS_NEW: '/farmer/products/new',
  FARMER_ORDERS: '/farmer/orders',
  FARMER_ADVISORY: '/farmer/advisory',
  FARMER_CROP_DOCTOR: '/farmer/crop-doctor',
  FARMER_CROP_DOCTOR_HISTORY: '/farmer/crop-doctor/history',
  FARMER_MARKET_FINDER: '/farmer/market-finder',
  FARMER_STORAGE_FINDER: '/farmer/storage-finder',
  FARMER_HARVEST_SERVICES: '/farmer/harvest-services',
  FARMER_WEATHER: '/farmer/weather',
  FARMER_SCHEMES: '/farmer/schemes',

  // Worker
  WORKER_DASHBOARD: '/worker',
  WORKER_PROFILE: '/worker/profile',
  WORKER_JOBS: '/worker/jobs',
  WORKER_APPLICATIONS: '/worker/applications',
  WORKER_HARVEST_SERVICES: '/worker/harvest-services',
  WORKER_SERVICE_PROFILE: '/worker/services',

  // Buyer
  BUYER_DASHBOARD: '/buyer',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_MARKETPLACE: '/buyer/marketplace',
  BUYER_ORDERS: '/buyer/orders',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_FARMERS: '/admin/farmers',
  ADMIN_WORKERS: '/admin/workers',
  ADMIN_BUYERS: '/admin/buyers',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_JOBS: '/admin/jobs',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_SCHEMES: '/admin/schemes',
  ADMIN_HARVEST_SERVICES: '/admin/harvest-services',
  ADMIN_REPORTS: '/admin/reports',
} as const;

// Worker skill categories
export const WORKER_SKILLS = [
  'Coconut Climbing & Harvesting',
  'Areca Nut Harvesting',
  'Cashew Harvesting',
  'Mango Harvesting',
  'Spraying (Pesticides/Fertilizers)',
  'Pruning & Trimming',
  'Weeding & Cleaning',
  'Land Preparation (Ploughing)',
  'Planting & Transplanting',
  'Irrigation Management',
  'General Agricultural Labour',
  'Tractor Operation',
  'Animal Husbandry',
] as const;
