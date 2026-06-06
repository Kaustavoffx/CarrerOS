"use client";

import { useCursor, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import * as THREE from "three";
import { useRef, useState, useMemo, memo, useEffect } from "react";

type NodeItem = {
  id: string;
  label: string;
  desc: string;
  pos: [number, number, number];
  color: string;
  size: number;
  emissive: string;
};

const nodesData: NodeItem[] = [
  { id: "core", label: "CareerOS Core", desc: "AI Orchestration Center", pos: [0, 0, 0], color: "#22d3ee", size: 0.28, emissive: "#0891b2" },
  { id: "skills", label: "Skills Matrix", desc: "28+ mapped competencies", pos: [2.0, 0.7, -0.6], color: "#67e8f9", size: 0.16, emissive: "#0891b2" },
  { id: "projects", label: "Projects Engine", desc: "Proof of Work verification", pos: [-1.6, 1.2, 0.8], color: "#cbd5e1", size: 0.16, emissive: "#475569" },
  { id: "certs", label: "Certifications", desc: "Verified credentials sync", pos: [-2.0, -0.8, -0.7], color: "#cbd5e1", size: 0.15, emissive: "#475569" },
  { id: "jobs", label: "Opportunity Matcher", desc: "Real-time market tracking", pos: [1.6, -1.5, 0.8], color: "#94a3b8", size: 0.16, emissive: "#334155" },
  { id: "opportunities", label: "Gaps & Growth", desc: "AI-identified growth vectors", pos: [0.3, 2.1, -1.0], color: "#cbd5e1", size: 0.15, emissive: "#475569" },
  { id: "roadmaps", label: "Roadmaps Lane", desc: "Adaptive career milestones", pos: [-0.9, -1.8, 1.3], color: "#06b6d4", size: 0.17, emissive: "#0891b2" }
];

// Define link connections
const linksData = [
  { from: "core", to: "skills" },
  { from: "core", to: "projects" },
  { from: "core", to: "certs" },
  { from: "core", to: "jobs" },
  { from: "core", to: "opportunities" },
  { from: "core", to: "roadmaps" },
  { from: "skills", to: "projects" },
  { from: "projects", to: "roadmaps" },
  { from: "roadmaps", to: "jobs" },
  { from: "jobs", to: "opportunities" },
  { from: "opportunities", to: "skills" }
];

function GalaxyNode({
  node,
  hoveredNode,
  setHoveredNode,
  invalidate
}: {
  node: NodeItem;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  invalidate: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const isHovered = hoveredNode === node.id;
  const isCore = node.id === "core";
  
  useCursor(isHovered);

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (isHovered ? 1.5 : 0.4);
      ringRef.current.rotation.x += delta * 0.1;
    }
    
    if (meshRef.current && isHovered) {
      // Floating breath animation
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.25, 0.15));
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.0, 0.15));
    }
  });

  return (
    <group position={node.pos}>
      
      {/* Node Sphere Core */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredNode(node.id);
          invalidate();
        }}
        onPointerOut={() => {
          setHoveredNode(null);
          invalidate();
        }}
      >
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshPhysicalMaterial
          color={node.color}
          emissive={node.emissive}
          emissiveIntensity={isHovered ? 4.0 : isCore ? 2.5 : 1.2}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Orbiting Ring Element */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[node.size * 1.4, node.size * 1.48, 32]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={isHovered ? 0.8 : 0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Tiny Point Light inside hovered or core node */}
      {(isHovered || isCore) && (
        <pointLight
          color={node.color}
          intensity={isHovered ? 4.0 : 1.5}
          distance={4}
          decay={2}
        />
      )}

      {/* Glassmorphic Billboard HTML Card Overlay */}
      <Html
        distanceFactor={6}
        position={[0, node.size * 1.8, 0]}
        center
        className="pointer-events-none select-none transition-all duration-300 transform"
        style={{
          opacity: hoveredNode === null || isHovered ? 1 : 0.25,
          scale: isHovered ? "1.08" : "0.95"
        }}
      >
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-[#141417] px-4 py-2 text-center whitespace-nowrap shadow-2xl transition-all duration-300 ${
            isHovered
              ? "bg-cyan-950/90 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              : "bg-[#08080a]"
          }`}
        >
          <span className="text-[11px] font-black uppercase tracking-wider text-white">
            {node.label}
          </span>
          {isHovered && (
            <span className="mt-1 text-[9px] text-cyan-300 font-semibold tracking-wide block">
              {node.desc}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Animated Neural Path Link Component
function NeuralPathLink({
  start,
  end,
  color,
  hovered,
  offset
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  hovered: boolean;
  offset: number;
}) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const particleRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    return () => {
      lineGeometry.dispose();
    };
  }, [lineGeometry]);

  useFrame((state) => {
    if (particleRef.current) {
      // Flow particle along link line
      const t = (state.clock.getElapsedTime() * 0.35 + offset) % 1.0;
      particleRef.current.position.copy(points[0]).lerp(points[1], t);
    }
  });

  return (
    <group>
      {/* Link Wire Path */}
      <line>
        <bufferGeometry attach="geometry" {...lineGeometry} />
        <lineBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.45 : 0.1}
          linewidth={1}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Signal flow particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.95 : 0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function GalaxyGroup({
  hoveredNode,
  setHoveredNode,
  invalidate
}: {
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  invalidate: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const baseRotationY = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slow constant ambient spin
      baseRotationY.current += delta * 0.04;

      // Mouse Parallax smooth lerp inertia
      const targetX = state.pointer.x * 0.3;
      const targetY = -state.pointer.y * 0.3;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, baseRotationY.current + targetX, 0.08);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetY, 0.08);
    }
  });

  // Build coordinate mapping
  const nodeCoords = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    nodesData.forEach((n) => {
      map[n.id] = n.pos;
    });
    return map;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Background Starfield atmosphere */}
      <points>
        <sphereGeometry args={[5, 16, 16]} />
        <pointsMaterial color="#ffffff" size={0.015} transparent opacity={0.12} sizeAttenuation />
      </points>

      {/* Links between Career OS Core and orbital nodes */}
      {linksData.map((link, idx) => {
        const start = nodeCoords[link.from];
        const end = nodeCoords[link.to];
        const linkColor = nodesData.find((n) => n.id === link.to || n.id === link.from)?.color ?? "#ffffff";
        const isHovered = hoveredNode === null || hoveredNode === link.from || hoveredNode === link.to;

        return (
          <NeuralPathLink
            key={`${link.from}-${link.to}`}
            start={start}
            end={end}
            color={linkColor}
            hovered={isHovered}
            offset={idx * 0.15}
          />
        );
      })}

      {/* Galaxy Mapped Nodes */}
      {nodesData.map((node) => (
        <GalaxyNode
          key={node.id}
          node={node}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          invalidate={invalidate}
        />
      ))}
    </group>
  );
}

function CanvasCleanup() {
  const { gl } = useThree();
  useEffect(() => {
    return () => {
      // Force clean up of all WebGL resources and release GPU resources immediately
      gl.dispose();
      const context = gl.getContext() as WebGLRenderingContext;
      if (context) {
        const extension = context.getExtension("WEBGL_lose_context");
        if (extension) {
          extension.loseContext();
        }
      }
    };
  }, [gl]);
  return null;
}

function HeroSceneComponent() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <motion.div
      className="relative h-[36rem] w-full overflow-hidden rounded-[24px] border border-[#141418] bg-[#050505] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:h-[42rem] lg:h-[46rem]"
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      id="hero-scene"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06),transparent_35%),linear-gradient(180deg,transparent,rgba(0,0,0,0.4))]" />
      
      {/* Glow Title overlay */}
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-[#141417] bg-[#0c0c0e] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
        </span>
        Career Galaxy Diagnostic
      </div>

      {/* Explanatory widget overlay */}
      <div className="absolute bottom-6 left-6 z-10 max-w-[16rem] rounded-2xl border border-[#141417] bg-[#0c0c0e] p-4 transition hover:border-[#202028]">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">AI Neural Engine</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Mapping Skills, Opportunities, and adaptive Roadmaps around the CareerOS Core. Hover over nodes to trigger focal assessments.
        </p>
      </div>

      {/* R3F Canvas Container */}
      <Canvas
        camera={{ position: [0, 0, 5.0], fov: 45 }}
        frameloop="demand"
        dpr={[1, 1.15]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <CanvasCleanup />
        <color attach="background" args={["#050505"]} />
        <fog attach="fog" args={["#050505", 5.5, 10]} />
        
        {/* Lights Setup */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} color="#ffffff" />
        <pointLight position={[0, 4, 3]} intensity={1.5} color="#22d3ee" distance={8} />

        <GalaxyGroup
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          invalidate={() => {}}
        />
      </Canvas>
    </motion.div>
  );
}

export const HeroScene = memo(HeroSceneComponent);