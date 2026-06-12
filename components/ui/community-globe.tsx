"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Sphere } from "@react-three/drei";
import * as THREE from "three";
import type { GlobeDataPoint } from "@/app/api/community/globe/route";

interface CommunityGlobeProps {
  data: GlobeDataPoint[];
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
}

const Earth = () => {
  return (
    <group>
      {/* Base Earth Sphere */}
      <Sphere args={[2, 64, 64]}>
        <meshPhongMaterial 
          color="#020617" 
          emissive="#000000"
          specular={new THREE.Color("#0ea5e9")}
          shininess={50}
          transparent={true}
          opacity={0.9}
        />
      </Sphere>
      
      {/* Wireframe overlay for tech aesthetic */}
      <Sphere args={[2.02, 32, 32]}>
        <meshBasicMaterial 
          color="#1e293b" 
          wireframe={true} 
          transparent={true} 
          opacity={0.15} 
        />
      </Sphere>
    </group>
  );
};

const DataPillar = ({ point }: { point: GlobeDataPoint }) => {
  const basePosition = useMemo(() => latLngToVector3(point.lat, point.lng, 2), [point]);
  
  // Create a quaternion to rotate the cylinder to point outwards from the center of the earth
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, basePosition.clone().normalize());
    return q;
  }, [basePosition]);

  // Adjust height based on data size (size ranges from 0.1 to 1.0)
  const height = point.size * 1.5;
  
  // We offset the position by half the height along the normal vector so the base sits on the sphere
  const position = useMemo(() => {
    const normal = basePosition.clone().normalize();
    return basePosition.clone().add(normal.multiplyScalar(height / 2));
  }, [basePosition, height]);

  return (
    <group position={position} quaternion={quaternion}>
      {/* Main glowing pillar */}
      <mesh>
        <cylinderGeometry args={[0.015, 0.015, height, 8]} />
        <meshBasicMaterial color={point.color} transparent opacity={0.8} />
      </mesh>
      
      {/* Halo/Glow effect around the pillar base */}
      <mesh position={[0, -height/2, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color={point.color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export function CommunityGlobe({ data }: CommunityGlobeProps) {
  // Center initial camera over India (approx lat: 20, lng: 77)
  const initialCameraPos = useMemo(() => latLngToVector3(20, 77, 6), []);

  return (
    <div className="w-full h-full relative bg-slate-950/50 rounded-xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] border border-white/5">
      <Canvas camera={{ position: initialCameraPos, fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#0ea5e9" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <group>
          {/* We wrap Earth and Pillars in a group to let them rotate together if we want, 
              but OrbitControls handles the user interaction. We'll let the Earth component rotate itself, 
              and the pillars should rotate with it. So we pass earth ref logic if we want them grouped. 
              Actually, easier: Let OrbitControls just rotate the whole scene based on user input. 
              For auto-rotation, OrbitControls has autoRotate built in. */}
          <Earth />
          {data.map((point, index) => (
            <DataPillar key={`${point.city}-${index}`} point={point} />
          ))}
        </group>

        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={8}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Overlay controls/legend hint */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
        <div className="text-[10px] text-slate-400 font-mono tracking-wider bg-slate-950/80 px-3 py-1.5 rounded border border-white/10 backdrop-blur-md">
          INTERACTIVE 3D GEO-MATRIX
        </div>
        <div className="text-[9px] text-slate-500 bg-slate-950/80 px-2 py-1 rounded border border-white/10 backdrop-blur-md">
          DRAG TO ROTATE • SCROLL TO ZOOM
        </div>
      </div>
    </div>
  );
}
