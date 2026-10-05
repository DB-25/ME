import type { VisitCell, VisitsData, YouCell } from "./visitsClient";

/**
 * SAMPLE DATA, local development only (`?visits=demo` on localhost). Invented places and counts, shown with a
 * "demo data" label. It never ships to a real visitor: the loader refuses any non-local host.
 */
const SAMPLE: Array<[city: string, lat: number, lon: number, country: string, count: number]> = [
  ["Boston", 42.36, -71.06, "US", 38],
  ["New York", 40.71, -74.0, "US", 21],
  ["San Francisco", 37.77, -122.42, "US", 17],
  ["Toronto", 43.65, -79.38, "CA", 6],
  ["Mexico City", 19.43, -99.13, "MX", 3],
  ["Sao Paulo", -23.55, -46.63, "BR", 5],
  ["London", 51.51, -0.13, "GB", 14],
  ["Berlin", 52.52, 13.4, "DE", 7],
  ["Paris", 48.86, 2.35, "FR", 6],
  ["Lagos", 6.52, 3.38, "NG", 4],
  ["Nairobi", -1.29, 36.82, "KE", 2],
  ["Cape Town", -33.92, 18.42, "ZA", 2],
  ["Dubai", 25.2, 55.27, "AE", 5],
  ["Bangalore", 12.97, 77.59, "IN", 46],
  ["Mumbai", 19.08, 72.88, "IN", 12],
  ["Delhi", 28.61, 77.21, "IN", 9],
  ["Singapore", 1.35, 103.82, "SG", 8],
  ["Tokyo", 35.68, 139.69, "JP", 7],
  ["Seoul", 37.57, 126.98, "KR", 3],
  ["Sydney", -33.87, 151.21, "AU", 4],
];

const CELL_DEG = 5;
const center = (v: number) => Math.floor(v / CELL_DEG) * CELL_DEG + CELL_DEG / 2;

export function demoVisits(): { data: VisitsData; you: YouCell } {
  const bins = new Map<string, [number, number, number]>();
  const countries = new Map<string, number>();
  let total = 0;
  for (const [, lat, lon, country, count] of SAMPLE) {
    const cell: [number, number] = [center(lat), center(lon)];
    const key = cell.join(",");
    bins.set(key, [cell[0], cell[1], (bins.get(key)?.[2] ?? 0) + count]);
    countries.set(country, (countries.get(country) ?? 0) + count);
    total += count;
  }
  const cells: VisitCell[] = [...bins.values()];
  const data: VisitsData = {
    cells,
    total,
    countries: [...countries.entries()].sort((a, b) => b[1] - a[1]),
    updatedAt: null,
    demo: true,
  };
  return { data, you: { lat: center(42.36), lon: center(-71.06), country: "US", counted: true } };
}
