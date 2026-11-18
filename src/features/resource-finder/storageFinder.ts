import { optionalCell, requiredCell, type CsvRecord } from './csv';
import { KONKAN_DISTRICTS } from '@/lib/constants';

export interface StorageFacility {
  id: string;
  district: string;
  name: string;
  type: string | null;
  address: string | null;
  managerName: string | null;
  contactNumber: string | null;
  capacityMt: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceUploadYear: string | null;
  unverifiedLead: boolean;
  verificationNote: string | null;
}

export function toStorageFacilities(rows: CsvRecord[]): StorageFacility[] {
  return rows.map((row, index) => {
    const rawCapacity = optionalCell(row, 'Capacity in MT');
    let capacityMt: number | null = null;
    if (rawCapacity !== null) {
      capacityMt = Number(rawCapacity);
      if (!Number.isFinite(capacityMt) || capacityMt < 0) {
        throw new Error(`Dataset row ${index + 2} has an invalid storage capacity.`);
      }
    }

    const district = requiredCell(row, 'District', index + 2);
    const name = requiredCell(row, 'Storage name', index + 2);
    const sourceName = optionalCell(row, 'Source');

    return {
      id: `${sourceName ?? 'storage-dataset'}:${index}:${district}:${name}`,
      district,
      name,
      type: optionalCell(row, 'Type'),
      address: optionalCell(row, 'Address'),
      managerName: optionalCell(row, 'Manager Name'),
      contactNumber: optionalCell(row, 'Mobile No'),
      capacityMt,
      sourceName,
      sourceUrl: optionalCell(row, 'Source URL'),
      sourceUploadYear: optionalCell(row, 'Source upload year'),
      unverifiedLead: optionalCell(row, 'Verification status') === 'Unverified lead',
      verificationNote: optionalCell(row, 'Verification note'),
    };
  });
}

export function getStorageDistricts(records: StorageFacility[]): string[] {
  return [...new Set([
    ...records.map((record) => record.district),
    ...KONKAN_DISTRICTS.Goa,
  ])]
    .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }));
}

export function filterStorageByDistrict(
  records: StorageFacility[],
  district: string
): StorageFacility[] {
  if (!district) return [];
  return records.filter((record) => record.district === district);
}
