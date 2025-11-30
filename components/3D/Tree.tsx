import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, ThreeElements, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../../types';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface TreeProps {
  onStarClick: () => void;
  onExplode: () => void;
  isGenerating: boolean;
  mode: TreeMode;
  userImages?: string[];
}

// --- SHADERS & MATERIALS ---

const FOLIAGE_VERTEX_SHADER = `
  uniform float uProgress;
  uniform float uTime;
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  varying vec3 vColor;
  
  float easeOutCubic(float x) {
    return 1.0 - pow(1.0 - x, 3.0);
  }

  void main() {
    float p = easeOutCubic(uProgress);
    
    // Interpolate position
    vec3 pos = mix(aChaosPos, aTargetPos, p);
    
    // CHAOS DRIFT: When p < 1.0 (dispersed), drift like magical dust
    if (p < 0.95) {
      float driftSpeed = 0.5;
      float driftX = sin(uTime * driftSpeed + aRandom * 10.0) * 0.5 * (1.0 - p);
      float driftY = cos(uTime * driftSpeed * 0.8 + aRandom * 20.0) * 0.5 * (1.0 - p);
      float driftZ = sin(uTime * driftSpeed * 0.5 + aRandom * 5.0) * 0.5 * (1.0 - p);
      pos += vec3(driftX, driftY, driftZ);
    } 
    // FORMED SWAY: Wind effect
    else {
      float sway = sin(uTime * 1.5 + pos.y * 0.5) * 0.03 * (pos.y + 1.0) * 0.1;
      pos.x += sway;
      pos.z += sway * 0.5;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = (8.0 * aRandom + 7.0) * (1.0 / -mvPosition.z);
    
    // COLOR PALETTE: Deep Luxury Emerald & Gold
    vec3 deepEmerald = vec3(0.002, 0.1, 0.05);  // Almost black-green
    vec3 richGreen = vec3(0.01, 0.25, 0.1);    // Lush green
    vec3 gold = vec3(1.0, 0.85, 0.3);          // Metallic Gold
    
    float heightMix = (aTargetPos.y + 2.0) / 10.0; 
    
    // Base gradient
    vColor = mix(deepEmerald, richGreen, heightMix * 0.8 + aRandom * 0.2);
    
    // Gold Dust: 5% of particles are pure gold
    if (aRandom > 0.95) {
       vColor = gold * 1.5; // HDR brightness
    }
  }
`;

const FOLIAGE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  
  void main() {
    vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
    float distSq = dot(circCoord, circCoord);
    if (distSq > 1.0) discard;
    
    float alpha = 1.0 - distSq;
    alpha = pow(alpha, 0.5);
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// --- HELPER FUNCTIONS ---

// Decreased radius for denser chaos cloud
const getRandomSpherePoint = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// --- SUB-COMPONENTS ---

const Foliage = ({ mode, onInteract, count = 50000 }: { mode: TreeMode, onInteract: () => void, count?: number }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const { geometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const chaosPos = [];
    const targetPos = [];
    const randoms = [];

    const height = 11;
    const baseRadius = 4.5;

    for (let i = 0; i < count; i++) {
      // Denser chaos radius (15 instead of 30)
      const cp = getRandomSpherePoint(15);
      // Flatten the chaos slightly for a nebula look
      cp.y *= 0.6; 
      
      chaosPos.push(cp.x, cp.y, cp.z);

      let h = Math.random(); 
      h = 1.0 - Math.pow(h, 0.8);
      
      const y = h * height - 2.5;
      const rMax = baseRadius * (1.0 - h);
      const rDist = Math.random();
      const r = rMax * Math.pow(rDist, 0.3); // Surface concentration
      
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      targetPos.push(x, y, z);
      randoms.push(Math.random());
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(targetPos, 3)); 
    geo.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPos, 3));
    geo.setAttribute('aChaosPos', new THREE.Float32BufferAttribute(chaosPos, 3));
    geo.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1));
    return { geometry: geo };
  }, [count]);

  useFrame((state) => {
    if (!shaderRef.current) return;
    const targetProgress = mode === TreeMode.FORMED ? 1.0 : 0.0;
    shaderRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
      shaderRef.current.uniforms.uProgress.value,
      targetProgress,
      0.02 // Slower, more majestic foliage movement
    );
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points 
      geometry={geometry} 
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
      onPointerOver={() => { if(mode === TreeMode.FORMED) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <shaderMaterial
        ref={shaderRef}
        vertexShader={FOLIAGE_VERTEX_SHADER}
        fragmentShader={FOLIAGE_FRAGMENT_SHADER}
        uniforms={{
          uProgress: { value: 0 },
          uTime: { value: 0 }
        }}
        transparent={true}
        depthWrite={false}
      />
    </points>
  );
};

const DynamicOrnaments = ({ mode, onInteract }: { mode: TreeMode, onInteract: () => void }) => {
  const count = 700; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorArray = useMemo(() => new Float32Array(count * 3), [count]);
  
  const data = useMemo(() => {
    const items = [];
    const phi = Math.PI * (3 - Math.sqrt(5));

    // LUXURY COLORS
    const colors = [
      new THREE.Color('#FFC800'), // Vivid Gold
      new THREE.Color('#F9A602'), // Deep Gold
      new THREE.Color('#DAA520'), // Goldenrod
      new THREE.Color('#8B0000'), // Dark Velvet Red
      new THREE.Color('#013220'), // British Racing Green
      new THREE.Color('#006400'), // Dark Green
      new THREE.Color('#2E8B57'), // Sea Green
    ];

    for (let i = 0; i < count; i++) {
      const cp = getRandomSpherePoint(18); // Reduced radius
      
      const y = (i / (count - 1)) * 9.5 - 2.0; 
      const hNorm = (y + 2.0) / 9.5;
      const radius = 4.3 * (1 - hNorm) + 0.3;
      const theta = phi * i * 6.0; 

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const tp = new THREE.Vector3(
         x * (0.92 + Math.random() * 0.15),
         y + (Math.random() - 0.5) * 0.2,
         z * (0.92 + Math.random() * 0.15)
      );

      const weight = 0.03 + Math.random() * 0.02;
      const color = colors[Math.floor(Math.random() * colors.length)];
      color.toArray(colorArray, i * 3);

      items.push({
        chaos: cp,
        target: tp,
        current: cp.clone(),
        weight,
        scale: 0.15 + Math.random() * 0.2
      });
    }
    return items;
  }, [colorArray]);

  const dummy = new THREE.Object3D();

  useFrame(() => {
    if (!meshRef.current) return;
    const isForming = mode === TreeMode.FORMED;
    
    data.forEach((item, i) => {
      const dest = isForming ? item.target : item.chaos;
      item.current.lerp(dest, item.weight);
      
      dummy.position.copy(item.current);
      dummy.scale.set(item.scale, item.scale, item.scale);
      dummy.rotation.x += 0.01;
      dummy.rotation.y += 0.01;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, count]} 
      castShadow 
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
      onPointerOver={() => { if(mode === TreeMode.FORMED) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[1, 32, 32]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </sphereGeometry>
      {/* High Gloss Material for Reflection */}
      <meshStandardMaterial 
        vertexColors
        roughness={0.05} // Almost mirror-like
        metalness={1} 
        envMapIntensity={3} // Catch the environment light
      />
    </instancedMesh>
  );
};

const FairyLights = ({ mode, onInteract }: { mode: TreeMode, onInteract: () => void }) => {
  const count = 400; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorArray = useMemo(() => new Float32Array(count * 3), [count]);

  const data = useMemo(() => {
    const items = [];
    // Warm white lights
    const c1 = new THREE.Color('#fffee0');
    const c2 = new THREE.Color('#ffd700');

    for (let i = 0; i < count; i++) {
      const cp = getRandomSpherePoint(20); // Reduced radius
      
      const h = Math.random();
      const y = h * 9.5 - 2.2;
      const rMax = 4.4 * (1 - h) + 0.2;
      const r = rMax * (0.85 + Math.random() * 0.25);
      const theta = Math.random() * Math.PI * 2;

      const tp = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));

      const weight = 0.08 + Math.random() * 0.05;
      
      const color = Math.random() > 0.5 ? c1 : c2;
      color.toArray(colorArray, i * 3);

      items.push({
        chaos: cp,
        target: tp,
        current: cp.clone(),
        weight,
        scale: 0.06 + Math.random() * 0.04
      });
    }
    return items;
  }, [colorArray]);

  const dummy = new THREE.Object3D();

  useFrame(() => {
    if (!meshRef.current) return;
    const isForming = mode === TreeMode.FORMED;
    data.forEach((item, i) => {
      const dest = isForming ? item.target : item.chaos;
      item.current.lerp(dest, item.weight);
      dummy.position.copy(item.current);
      dummy.scale.set(item.scale, item.scale, item.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, count]} 
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
    >
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </sphereGeometry>
      <meshStandardMaterial 
        vertexColors
        emissiveIntensity={4} // High emissive for bloom
        toneMapped={false}
      />
    </instancedMesh>
  );
};

const LuxuryGifts = ({ mode, onInteract }: { mode: TreeMode, onInteract: () => void }) => {
  const count = 120;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorArray = useMemo(() => new Float32Array(count * 3), [count]);
  
  const data = useMemo(() => {
    const items = [];
    const colors = [
      new THREE.Color('#111111'), // Black Box
      new THREE.Color('#550000'), // Red Velvet
      new THREE.Color('#D4AF37'), // Gold
      new THREE.Color('#FFFFFF'), // White Satin
    ];

    for (let i = 0; i < count; i++) {
      const cp = getRandomSpherePoint(16); // Reduced radius
      cp.y = Math.abs(cp.y) + 5; // Start high up in chaos but closer

      // DISTRIBUTION LOGIC: Mixed throughout tree
      // Height variable with slight bottom bias but full coverage
      const h = Math.random();
      const y = (Math.pow(h, 1.2) * 10.0) - 2.2; 
      
      const hNorm = (y + 2.2) / 10.0;
      // Radius follows tree cone shape
      const rMax = 4.0 * (1.0 - hNorm) + 0.5;
      
      // Place mostly on surface but allow some embedding
      const r = rMax * (0.6 + Math.random() * 0.4); 
      
      const angle = Math.random() * Math.PI * 2;
      
      const tp = new THREE.Vector3(
        Math.cos(angle) * r,
        y, 
        Math.sin(angle) * r
      );

      const weight = 0.015 + Math.random() * 0.01;
      const color = colors[Math.floor(Math.random() * colors.length)];
      color.toArray(colorArray, i * 3);
      
      // Random initial rotation
      const rot = new THREE.Euler(
        Math.random() * Math.PI, 
        Math.random() * Math.PI, 
        Math.random() * Math.PI
      );

      items.push({
        chaos: cp,
        target: tp,
        current: cp.clone(),
        weight,
        scale: new THREE.Vector3(0.35 + Math.random()*0.3, 0.35 + Math.random()*0.3, 0.35 + Math.random()*0.3),
        rotation: rot,
        rotSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.02 }
      });
    }
    return items;
  }, [colorArray]);

  const dummy = new THREE.Object3D();

  useFrame(() => {
    if (!meshRef.current) return;
    const isForming = mode === TreeMode.FORMED;

    data.forEach((item, i) => {
      const dest = isForming ? item.target : item.chaos;
      item.current.lerp(dest, item.weight);
      
      dummy.position.copy(item.current);
      dummy.scale.copy(item.scale);
      
      // Apply gentle rotation animation
      item.rotation.x += item.rotSpeed.x;
      item.rotation.y += item.rotSpeed.y;
      dummy.rotation.copy(item.rotation);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, count]} 
      castShadow 
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
      onPointerOver={() => { if(mode === TreeMode.FORMED) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshStandardMaterial 
        vertexColors
        roughness={0.3}
        metalness={0.8}
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

// --- USER PHOTO COMPONENT ---

const UserPhotoFrame = ({ 
  textureUrl, 
  index, 
  totalCount, 
  mode,
  onInteract,
  isFocused,
  onFocus
}: { 
  textureUrl: string, 
  index: number, 
  totalCount: number, 
  mode: TreeMode,
  onInteract: () => void,
  isFocused: boolean,
  onFocus: () => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const { camera } = useThree();
  
  // Calculate Positions
  const { chaos, target, scale } = useMemo(() => {
    // Chaos Position - Denser
    const cp = getRandomSpherePoint(14);
    
    // Target Position: Spiral distribution
    const hNorm = (index / totalCount); 
    const y = hNorm * 8.0 - 2.0;
    const rMax = 4.2 * (1.0 - (y + 2.0)/10.0) + 0.6;
    const theta = index * 2.4; 

    const tp = new THREE.Vector3(
        Math.cos(theta) * rMax,
        y,
        Math.sin(theta) * rMax
    );

    return {
      chaos: cp,
      target: tp,
      scale: 0.8, 
    };
  }, [index, totalCount]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    let dest = new THREE.Vector3();
    let currentScale = scale;

    if (isFocused) {
      // FOCUS MODE: Fly to center and scale up
      dest.set(0, 1, 0); // Center of world
      currentScale = 3.5;
      
      // Look at camera
      meshRef.current.lookAt(camera.position);
    } else {
      // NORMAL MODE
      const isForming = mode === TreeMode.FORMED;
      dest = isForming ? target : chaos;
      
      if (isForming) {
         // Billboard effect
         meshRef.current.lookAt(0, meshRef.current.position.y, 0);
         meshRef.current.rotation.y += Math.PI; 
      } else {
         // Chaos rotation
         meshRef.current.rotation.x += 0.01;
         meshRef.current.rotation.y += 0.01;
      }
    }

    // Smooth lerp
    meshRef.current.position.lerp(dest, 0.05);
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, currentScale, 0.05);
    meshRef.current.scale.set(s, s, 0.05);
  });

  return (
    <mesh 
      ref={meshRef}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (mode === TreeMode.CHAOS) {
          onFocus(); 
        } else {
          onInteract();
        }
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <boxGeometry args={[1, 1, 1]} />
      {[...Array(4)].map((_, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color="#FFD700" metalness={1} roughness={0.1} />
      ))}
      <meshBasicMaterial attach="material-4" map={texture} toneMapped={false} /> {/* Front Face */}
      <meshStandardMaterial attach="material-5" color="#FFD700" metalness={1} roughness={0.1} /> {/* Back Face */}
    </mesh>
  );
};

const UserGallery = ({ 
  images, 
  mode, 
  onInteract,
  focusedIndex,
  setFocusedIndex
}: { 
  images: string[], 
  mode: TreeMode, 
  onInteract: () => void,
  focusedIndex: number | null,
  setFocusedIndex: (i: number | null) => void
}) => {
   if (!images || images.length === 0) return null;
   
   return (
     <group>
       {images.map((url, i) => (
         <UserPhotoFrame 
            key={url} 
            textureUrl={url} 
            index={i} 
            totalCount={images.length} 
            mode={mode}
            onInteract={onInteract}
            isFocused={focusedIndex === i}
            onFocus={() => setFocusedIndex(focusedIndex === i ? null : i)}
         />
       ))}
     </group>
   );
};

// --- MAIN COMPONENT ---

export const GrandTree: React.FC<TreeProps> = ({ onStarClick, onExplode, isGenerating, mode, userImages = [] }) => {
  const starRef = useRef<THREE.Group>(null);
  const [starCurrentPos] = useState(new THREE.Vector3(0, 30, 0)); 
  const [focusedImageIndex, setFocusedImageIndex] = useState<number | null>(null);

  // Generate Positions for the Star
  const starTargetPos = useMemo(() => new THREE.Vector3(0, 9.2, 0), []); 
  const starChaosPos = useMemo(() => getRandomSpherePoint(18), []); 

  // 5-Pointed Star Shape
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.9;
    const innerRadius = 0.4;
    const angleOffset = -Math.PI / 2; // Point upwards

    for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const theta = angleOffset + (i * Math.PI) / 5;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 3
  }), []);

  const handleInteraction = () => {
    if (mode === TreeMode.FORMED) {
      onExplode();
    } else {
      // If in Chaos mode and background clicked, clear focus
      setFocusedImageIndex(null);
    }
  };

  // Clear focus when tree re-assembles
  useEffect(() => {
    if (mode === TreeMode.FORMED) {
      setFocusedImageIndex(null);
    }
  }, [mode]);

  useFrame((state) => {
    const dest = mode === TreeMode.FORMED ? starTargetPos : starChaosPos;
    starCurrentPos.lerp(dest, 0.04);
    
    if (starRef.current) {
      starRef.current.position.copy(starCurrentPos);
      starRef.current.rotation.y += 0.02;

      if (mode === TreeMode.CHAOS) {
          starRef.current.rotation.x += 0.01;
          starRef.current.rotation.z += 0.01;
      } else {
          starRef.current.rotation.x = THREE.MathUtils.lerp(starRef.current.rotation.x, 0, 0.05);
          starRef.current.rotation.z = THREE.MathUtils.lerp(starRef.current.rotation.z, 0, 0.05);
      }
      
      if (isGenerating) {
        const s = 1.3 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
        starRef.current.scale.set(s, s, s);
      } else {
         starRef.current.scale.set(1.2, 1.2, 1.2);
      }
    }
  });

  return (
    <group>
      <Foliage mode={mode} onInteract={handleInteraction} />
      <FairyLights mode={mode} onInteract={handleInteraction} />
      <DynamicOrnaments mode={mode} onInteract={handleInteraction} />
      <LuxuryGifts mode={mode} onInteract={handleInteraction} />
      
      <UserGallery 
        images={userImages} 
        mode={mode} 
        onInteract={handleInteraction} 
        focusedIndex={focusedImageIndex}
        setFocusedIndex={setFocusedImageIndex}
      />

      {/* THE GRAND STAR */}
      <group 
        ref={starRef} 
        onClick={(e) => { 
          e.stopPropagation(); 
          if (mode === TreeMode.FORMED) onStarClick(); 
          else handleInteraction(); 
        }}
        onPointerOver={() => { if(mode === TreeMode.FORMED) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <mesh castShadow position={[0, 0, 0]} >
          <extrudeGeometry args={[starShape, extrudeSettings]} />
          <meshStandardMaterial 
            color="#FFD700"
            emissive="#FFA500"
            emissiveIntensity={isGenerating ? 10 : 4}
            roughness={0}
            metalness={1}
            toneMapped={false}
          />
        </mesh>
        <pointLight intensity={isGenerating ? 8 : 4} distance={20} color="#FFD700" decay={2} />
      </group>
    </group>
  );
};