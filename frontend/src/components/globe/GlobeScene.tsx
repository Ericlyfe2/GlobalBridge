"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { Vector3 } from "three";

// ─── Types ───────────────────────────────────────────────────────
export type CountryMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "scholarship" | "mentor" | "university" | "job" | "housing";
  count: number;
};

type ConnectionLine = {
  from: [number, number];
  to: [number, number];
};

type GlobeProps = {
  markers?: CountryMarker[];
  connections?: ConnectionLine[];
  autoRotate?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────
function latLngToVector3(lat: number, lng: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ─── Earth ────────────────────────────────────────────────────────
function Earth({ radius }: { radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
    );
  }, []);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshPhongMaterial map={texture} specular={new THREE.Color(0x333333)} shininess={15} />
    </mesh>
  );
}

// ─── Atmosphere ───────────────────────────────────────────────────
function Atmosphere({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.015, 64, 64]} />
      <meshPhongMaterial
        transparent
        opacity={0.12}
        color="#4fc3f7"
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ─── Marker ───────────────────────────────────────────────────────
function Marker({
  marker,
  radius,
  onClick,
}: {
  marker: CountryMarker;
  radius: number;
  onClick: (m: CountryMarker) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius * 1.02), [marker.lat, marker.lng, radius]);
  const scale = hovered ? 1.8 : 1;

  const colorMap: Record<string, string> = {
    scholarship: "#f59e0b",
    mentor: "#10b981",
    university: "#3b82f6",
    job: "#8b5cf6",
    housing: "#ef4444",
  };

  return (
    <group position={pos}>
      <mesh
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(marker)}
      >
        <sphereGeometry args={[0.04 * radius, 12, 12]} />
        <meshBasicMaterial color={colorMap[marker.type] || "#3b82f6"} />
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04 * radius, 0.08 * radius, 24]} />
        <meshBasicMaterial
          color={colorMap[marker.type] || "#3b82f6"}
          transparent
          opacity={hovered ? 0.6 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hovered && (
        <Html center distanceFactor={radius * 0.5}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm border border-white/10">
            <p className="font-medium">{marker.name}</p>
            <p className="text-white/60 text-[10px]">{marker.count} opportunities</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Connection Line ──────────────────────────────────────────────
function ConnectionLine({ from, to, radius }: { from: [number, number]; to: [number, number]; radius: number }) {
  const points = useMemo(() => {
    const start = latLngToVector3(from[0], from[1], radius);
    const end = latLngToVector3(to[0], to[1], radius);
    const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(radius * 1.5);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(30);
  }, [from, to, radius]);

  return (
    <Line
      points={points}
      color="#4fc3f7"
      transparent
      opacity={0.2}
      lineWidth={1}
    />
  );
}

// ─── Scene Content ────────────────────────────────────────────────
function GlobeContent({
  markers: rawMarkers,
  connections: rawConnections,
  autoRotate = true,
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [selectedMarker, setSelectedMarker] = useState<CountryMarker | null>(null);

  const RADIUS = 2;

  const defaultMarkers: CountryMarker[] = useMemo(
    () =>
      rawMarkers ?? [
        { id: "1", name: "Toronto", lat: 43.65, lng: -79.38, type: "university", count: 24 },
        { id: "2", name: "London", lat: 51.5, lng: -0.13, type: "scholarship", count: 56 },
        { id: "3", name: "Berlin", lat: 52.52, lng: 13.4, type: "job", count: 31 },
        { id: "4", name: "Sydney", lat: -33.87, lng: 151.2, type: "mentor", count: 12 },
        { id: "5", name: "Accra", lat: 5.6, lng: -0.19, type: "scholarship", count: 18 },
        { id: "6", name: "Mumbai", lat: 19.08, lng: 72.88, type: "job", count: 42 },
        { id: "7", name: "Nairobi", lat: -1.29, lng: 36.82, type: "mentor", count: 9 },
        { id: "8", name: "Beijing", lat: 39.9, lng: 116.4, type: "university", count: 37 },
        { id: "9", name: "Paris", lat: 48.85, lng: 2.35, type: "housing", count: 15 },
        { id: "10", name: "Dubai", lat: 25.2, lng: 55.27, type: "job", count: 28 },
        { id: "11", name: "Lagos", lat: 6.52, lng: 3.38, type: "scholarship", count: 22 },
        { id: "12", name: "New York", lat: 40.71, lng: -74.01, type: "university", count: 63 },
        { id: "13", name: "Cape Town", lat: -33.92, lng: 18.42, type: "mentor", count: 7 },
        { id: "14", name: "Tokyo", lat: 35.68, lng: 139.69, type: "job", count: 45 },
        { id: "15", name: "São Paulo", lat: -23.55, lng: -46.63, type: "housing", count: 11 },
      ],
    [rawMarkers],
  );

  const defaultConnections: ConnectionLine[] = useMemo(
    () =>
      rawConnections ?? [
        { from: [5.6, -0.19], to: [43.65, -79.38] },
        { from: [19.08, 72.88], to: [51.5, -0.13] },
        { from: [6.52, 3.38], to: [48.85, 2.35] },
        { from: [-1.29, 36.82], to: [52.52, 13.4] },
        { from: [5.6, -0.19], to: [-33.87, 151.2] },
        { from: [19.08, 72.88], to: [40.71, -74.01] },
        { from: [6.52, 3.38], to: [35.68, 139.69] },
        { from: [-23.55, -46.63], to: [43.65, -79.38] },
        { from: [5.6, -0.19], to: [52.52, 13.4] },
        { from: [-1.29, 36.82], to: [51.5, -0.13] },
      ],
    [rawConnections],
  );

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate && !selectedMarker) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const handleMarkerClick = useCallback(
    (marker: CountryMarker) => {
      setSelectedMarker(marker);
      const pos = latLngToVector3(marker.lat, marker.lng, RADIUS * 3);
      camera.position.lerp(pos, 0.05);
    },
    [camera],
  );

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <directionalLight position={[-5, -2, -3]} intensity={0.3} />

      <Earth radius={RADIUS} />
      <Atmosphere radius={RADIUS} />

      {defaultConnections.map((c, i) => (
        <ConnectionLine key={i} from={c.from} to={c.to} radius={RADIUS} />
      ))}

      {defaultMarkers.map((m) => (
        <Marker key={m.id} marker={m} radius={RADIUS} onClick={handleMarkerClick} />
      ))}
    </group>
  );
}

// ─── Public Component ─────────────────────────────────────────────
export function GlobeCanvas({ markers, connections, autoRotate, className = "" }: GlobeProps & { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <GlobeContent markers={markers} connections={connections} autoRotate={autoRotate} />
        <OrbitControls
          enableZoom
          enablePan
          zoomSpeed={0.5}
          panSpeed={0.3}
          minDistance={4}
          maxDistance={12}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
