import { optionalCell, requiredCell, type CsvRecord } from './csv';

export interface MarketRecord {
  state: string;
  district: string;
  marketName: string;
  commodityGroup: string | null;
  variety: string | null;
}

export interface MarketListing {
  id: string;
  state: string;
  district: string;
  marketName: string;
  commodityGroups: string[];
  varieties: string[];
}

export interface MarketFilters {
  state: string;
  district: string;
  commodityGroup?: string;
  variety?: string;
}

export function toMarketRecords(rows: CsvRecord[]): MarketRecord[] {
  return rows.map((row, index) => ({
    state: requiredCell(row, 'State Name', index + 2),
    district: requiredCell(row, 'District Name', index + 2),
    marketName: requiredCell(row, 'Market Name', index + 2),
    commodityGroup: optionalCell(row, 'Group'),
    variety: optionalCell(row, 'Variety'),
  }));
}

export function getMarketStates(records: MarketRecord[]): string[] {
  return uniqueSorted(records.map((record) => record.state));
}

export function getMarketDistricts(records: MarketRecord[], state: string): string[] {
  return uniqueSorted(
    records.filter((record) => record.state === state).map((record) => record.district)
  );
}

export function getMarketFacets(
  records: MarketRecord[],
  state: string,
  district: string,
  commodityGroup = ''
): { commodityGroups: string[]; varieties: string[] } {
  const locationRecords = records.filter(
    (record) => record.state === state && record.district === district
  );
  const groupRecords = commodityGroup
    ? locationRecords.filter((record) => record.commodityGroup === commodityGroup)
    : locationRecords;

  return {
    commodityGroups: uniqueSorted(locationRecords.map((record) => record.commodityGroup)),
    varieties: uniqueSorted(groupRecords.map((record) => record.variety)),
  };
}

export function filterMarkets(records: MarketRecord[], filters: MarketFilters): MarketListing[] {
  const matches = records.filter((record) =>
    record.state === filters.state &&
    record.district === filters.district &&
    (!filters.commodityGroup || record.commodityGroup === filters.commodityGroup) &&
    (!filters.variety || record.variety === filters.variety)
  );
  const markets = new Map<string, {
    state: string;
    district: string;
    marketName: string;
    commodityGroups: Set<string>;
    varieties: Set<string>;
  }>();

  for (const record of matches) {
    const id = `${record.state}\u0000${record.district}\u0000${record.marketName}`;
    let market = markets.get(id);
    if (!market) {
      market = {
        state: record.state,
        district: record.district,
        marketName: record.marketName,
        commodityGroups: new Set<string>(),
        varieties: new Set<string>(),
      };
      markets.set(id, market);
    }
    if (record.commodityGroup) market.commodityGroups.add(record.commodityGroup);
    if (record.variety) market.varieties.add(record.variety);
  }

  return [...markets.entries()]
    .map(([id, market]) => ({
      id,
      state: market.state,
      district: market.district,
      marketName: market.marketName,
      commodityGroups: [...market.commodityGroups].sort(collate),
      varieties: [...market.varieties].sort(collate),
    }))
    .sort((left, right) => collate(left.marketName, right.marketName));
}

function uniqueSorted(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))].sort(collate);
}

function collate(left: string, right: string): number {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}
