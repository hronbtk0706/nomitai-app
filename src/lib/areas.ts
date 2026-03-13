export interface Area {
  name: string;
  lat: number;
  lng: number;
}

export const AREAS: Area[] = [
  { name: "札幌", lat: 43.0621, lng: 141.3544 },
  { name: "仙台", lat: 38.2682, lng: 140.8694 },
  { name: "東京", lat: 35.6762, lng: 139.6503 },
  { name: "横浜", lat: 35.4437, lng: 139.6380 },
  { name: "名古屋", lat: 35.1815, lng: 136.9066 },
  { name: "京都", lat: 35.0116, lng: 135.7681 },
  { name: "大阪", lat: 34.6937, lng: 135.5023 },
  { name: "神戸", lat: 34.6901, lng: 135.1956 },
  { name: "広島", lat: 34.3853, lng: 132.4553 },
  { name: "福岡", lat: 33.5904, lng: 130.4017 },
  { name: "那覇", lat: 26.2124, lng: 127.6809 },
];

export const AREA_NAMES = AREAS.map((a) => a.name);

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestArea(lat: number, lng: number): string {
  let nearest = AREAS[0];
  let minDist = Infinity;
  for (const area of AREAS) {
    const d = haversineDistance(lat, lng, area.lat, area.lng);
    if (d < minDist) {
      minDist = d;
      nearest = area;
    }
  }
  return nearest.name;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}
