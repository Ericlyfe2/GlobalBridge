// Marker + corridor data for the landing-hero globe. Represents GlobalBridge's
// core network: students moving from Global-South origin cities to the study
// destinations surfaced across the app (community hubs, opportunities, housing).
//
// Shape matches the `interactive-globe` component's props:
//   markers:      { lat, lng, label? }[]
//   connections:  { from: [lat, lng]; to: [lat, lng] }[]

export type GlobePoint = { lat: number; lng: number; label?: string };
export type GlobeArc = { from: [number, number]; to: [number, number] };

// ── Cities ──────────────────────────────────────────────────────────────────
// Origin hubs (students' home cities)
const ACCRA: GlobePoint = { lat: 5.6, lng: -0.19, label: "Accra" };
const LAGOS: GlobePoint = { lat: 6.52, lng: 3.38, label: "Lagos" };
const NAIROBI: GlobePoint = { lat: -1.29, lng: 36.82, label: "Nairobi" };
const MUMBAI: GlobePoint = { lat: 19.08, lng: 72.88, label: "Mumbai" };
const DELHI: GlobePoint = { lat: 28.61, lng: 77.21, label: "Delhi" };
const MANILA: GlobePoint = { lat: 14.6, lng: 120.98, label: "Manila" };
const DHAKA: GlobePoint = { lat: 23.81, lng: 90.41, label: "Dhaka" };
const LIMA: GlobePoint = { lat: -12.05, lng: -77.04, label: "Lima" };
const SAO_PAULO: GlobePoint = { lat: -23.55, lng: -46.63, label: "São Paulo" };

// Destination hubs (study-abroad cities used throughout the app)
const TORONTO: GlobePoint = { lat: 43.65, lng: -79.38, label: "Toronto" };
const NEW_YORK: GlobePoint = { lat: 40.71, lng: -74.01, label: "New York" };
const LONDON: GlobePoint = { lat: 51.51, lng: -0.13, label: "London" };
const MANCHESTER: GlobePoint = { lat: 53.48, lng: -2.24, label: "Manchester" };
const BERLIN: GlobePoint = { lat: 52.52, lng: 13.4, label: "Berlin" };
const SYDNEY: GlobePoint = { lat: -33.87, lng: 151.21, label: "Sydney" };

export const GLOBE_MARKERS: GlobePoint[] = [
  ACCRA, LAGOS, NAIROBI, MUMBAI, DELHI, MANILA, DHAKA, LIMA, SAO_PAULO,
  TORONTO, NEW_YORK, LONDON, MANCHESTER, BERLIN, SYDNEY,
];

const arc = (from: GlobePoint, to: GlobePoint): GlobeArc => ({
  from: [from.lat, from.lng],
  to: [to.lat, to.lng],
});

// Real corridors mirroring the destination cities in the community hubs
// (Ghana → Toronto/London/Berlin/Manchester, Nigeria → London/NY/Toronto,
//  India → Toronto/Sydney, etc.).
export const GLOBE_CONNECTIONS: GlobeArc[] = [
  arc(ACCRA, TORONTO),
  arc(ACCRA, LONDON),
  arc(ACCRA, MANCHESTER),
  arc(LAGOS, LONDON),
  arc(LAGOS, NEW_YORK),
  arc(LAGOS, TORONTO),
  arc(NAIROBI, LONDON),
  arc(NAIROBI, BERLIN),
  arc(MUMBAI, LONDON),
  arc(DELHI, TORONTO),
  arc(DELHI, SYDNEY),
  arc(MANILA, SYDNEY),
  arc(DHAKA, LONDON),
  arc(LIMA, NEW_YORK),
  arc(SAO_PAULO, TORONTO),
];
