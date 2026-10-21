"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";

import type { Cubie, Vec3 } from "@/lib/cube";
import type { CubeEngine, Transform } from "@/lib/cube-engine";

const SPACING = 1.02;
const CUBIE_SIZE = 0.97;

const scratchMatrix = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();

function applyTransform(group: THREE.Group, transform: Transform): void {
  const o = transform.orientation;

  scratchMatrix.set(
    o[0][0],
    o[0][1],
    o[0][2],
    0,
    o[1][0],
    o[1][1],
    o[1][2],
    0,
    o[2][0],
    o[2][1],
    o[2][2],
    0,
    0,
    0,
    0,
    1,
  );

  scratchQuaternion.setFromRotationMatrix(scratchMatrix);
  group.quaternion.copy(scratchQuaternion);
  group.position.set(
    transform.position[0] * SPACING,
    transform.position[1] * SPACING,
    transform.position[2] * SPACING,
  );
}

function stickerRotation(normal: Vec3): Vec3 {
  if (normal[2] !== 0) {
    return normal[2] > 0 ? [0, 0, 0] : [0, Math.PI, 0];
  }
  if (normal[0] !== 0) {
    return normal[0] > 0 ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0];
  }
  return normal[1] > 0 ? [-Math.PI / 2, 0, 0] : [Math.PI / 2, 0, 0];
}

function Sticker({ normal, color }: { normal: Vec3; color: string }) {
  return (
    <RoundedBox
      args={[0.82, 0.82, 0.07]}
      radius={0.11}
      smoothness={4}
      position={[
        normal[0] * (CUBIE_SIZE / 2 - 0.02),
        normal[1] * (CUBIE_SIZE / 2 - 0.02),
        normal[2] * (CUBIE_SIZE / 2 - 0.02),
      ]}
      rotation={stickerRotation(normal)}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.32}
        metalness={0.05}
        envMapIntensity={0.6}
      />
    </RoundedBox>
  );
}

interface CubieMeshProps {
  cubie: Cubie;
  register: (id: string, group: THREE.Group | null) => void;
}

const CubieMesh = memo(function CubieMesh({ cubie, register }: CubieMeshProps) {
  return (
    <group ref={(group) => register(cubie.id, group)}>
      <RoundedBox
        args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]}
        radius={0.08}
        smoothness={4}
      >
        <meshStandardMaterial
          color="#0b0c10"
          roughness={0.45}
          metalness={0.35}
        />
      </RoundedBox>
      {cubie.stickers.map((sticker, index) => (
        <Sticker key={index} normal={sticker.normal} color={sticker.color} />
      ))}
    </group>
  );
});

function Scene({ engine }: { engine: CubeEngine }) {
  const groups = useRef(new Map<string, THREE.Group>());
  const cubies = useMemo(() => engine.cubies, [engine]);
  const cubiesById = useMemo(
    () => new Map(cubies.map((cubie) => [cubie.id, cubie])),
    [cubies],
  );

  const register = useCallback(
    (id: string, group: THREE.Group | null) => {
      if (!group) {
        groups.current.delete(id);
        return;
      }

      groups.current.set(id, group);
      const cubie = cubiesById.get(id);
      if (cubie) applyTransform(group, engine.transformFor(cubie));
    },
    [cubiesById, engine],
  );

  useFrame((_, delta) => {
    engine.tick(delta);

    for (const cubie of engine.cubies) {
      const group = groups.current.get(cubie.id);
      if (!group) continue;
      applyTransform(group, engine.transformFor(cubie));
    }
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 9, 7]} intensity={2.6} />
      <directionalLight
        position={[-7, -5, -6]}
        intensity={1.1}
        color="#c4b5fd"
      />
      <directionalLight position={[0, 0, 8]} intensity={0.9} color="#ffffff" />

      {cubies.map((cubie) => (
        <CubieMesh key={cubie.id} cubie={cubie} register={register} />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={14}
        rotateSpeed={0.7}
      />
    </>
  );
}

export default function CubeScene({ engine }: { engine: CubeEngine }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [5, 4.4, 6], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Scene engine={engine} />
    </Canvas>
  );
}
