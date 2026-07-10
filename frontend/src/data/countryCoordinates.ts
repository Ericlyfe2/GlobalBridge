// Approximate lat/lng centroids for the destination & origin countries that
// appear in opportunity listings. Used to place markers on the 3D globe.
// Values are rough national centroids — precise enough for globe placement.

export const countryCoordinates: Record<string, [number, number]> = {
  // North America
  "united states": [39.83, -98.58],
  "usa": [39.83, -98.58],
  "canada": [56.13, -106.35],
  "mexico": [23.63, -102.55],

  // Europe
  "united kingdom": [54.0, -2.0],
  "uk": [54.0, -2.0],
  "ireland": [53.41, -8.24],
  "germany": [51.17, 10.45],
  "france": [46.6, 2.35],
  "netherlands": [52.13, 5.29],
  "spain": [40.46, -3.75],
  "italy": [41.87, 12.57],
  "sweden": [60.13, 18.64],
  "norway": [60.47, 8.47],
  "switzerland": [46.82, 8.23],
  "poland": [51.92, 19.15],
  "portugal": [39.4, -8.22],

  // Asia
  "china": [35.86, 104.2],
  "india": [20.59, 78.96],
  "japan": [36.2, 138.25],
  "south korea": [35.91, 127.77],
  "singapore": [1.35, 103.82],
  "hong kong": [22.32, 114.17],
  "malaysia": [4.21, 101.98],
  "pakistan": [30.38, 69.35],
  "bangladesh": [23.68, 90.36],
  "philippines": [12.88, 121.77],
  "vietnam": [14.06, 108.28],
  "indonesia": [-0.79, 113.92],

  // Middle East
  "united arab emirates": [23.42, 53.85],
  "uae": [23.42, 53.85],
  "saudi arabia": [23.89, 45.08],
  "qatar": [25.35, 51.18],
  "turkey": [38.96, 35.24],

  // Africa
  "nigeria": [9.08, 8.68],
  "ghana": [7.95, -1.02],
  "kenya": [-0.02, 37.91],
  "south africa": [-30.56, 22.94],
  "egypt": [26.82, 30.8],
  "ethiopia": [9.15, 40.49],
  "tanzania": [-6.37, 34.89],
  "morocco": [31.79, -7.09],

  // Oceania
  "australia": [-25.27, 133.78],
  "new zealand": [-40.9, 174.89],

  // South America
  "brazil": [-14.24, -51.93],
  "argentina": [-38.42, -63.62],
  "chile": [-35.68, -71.54],
  "colombia": [4.57, -74.3],
  "peru": [-9.19, -75.02],
};

/** Look up a country's coordinates by name, case-insensitively. */
export function coordsForCountry(country: string): [number, number] | undefined {
  return countryCoordinates[country.trim().toLowerCase()];
}
