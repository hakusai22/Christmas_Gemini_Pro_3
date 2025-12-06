import React, { Suspense } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { GrandTree } from './3D/Tree';
import { FloatingSparkles } from './3D/Sparkles';
import { TreeMode } from '../types';

// Fix for missing R3F JSX types in this environment
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      fog: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      group: any;
    }
  }
}

interface SceneProps {
  onStarClick: () => void;
  onExplode: () => void;
  isGenerating: boolean;
  treeMode: TreeMode;
  userImages: string[];
}

export const Scene: React.FC<SceneProps> = ({ onStarClick, onExplode, isGenerating, treeMode, userImages }) => {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMappingExposure: 1.5 }}>
      {/* Camera positioned for grandeur */}
      <PerspectiveCamera makeDefault position={[0, 4, 22]} fov={40} />
      
      <color attach="background" args={['#010b05']} />
      <fog attach="fog" args={['#010b05', 10, 45]} />

      <Suspense fallback={null}>
        {/* Environment: City preset gives high contrast reflections perfect for gold */}
        <Environment preset="city" background={false} blur={0.8} />

        {/* Lighting Strategy: Cinematic High Contrast & Rim Lighting */}
        <ambientLight intensity={0.2} /> {/* Dark shadows */}
        
        {/* Main Key Light - Warm Gold */}
        <spotLight 
          position={[10, 15, 10]} 
          angle={0.4} 
          penumbra={1} 
          intensity={200} 
          castShadow 
          shadow-bias={-0.0001}
          color="#ffedba"
        />
        
        {/* Rim Light - Cool contrast to emphasize outline */}
        <spotLight 
          position={[-10, 10, -10]} 
          angle={0.5} 
          intensity={300} 
          color="#cceeff" 
        />
        
        {/* Fill Light - Warmth from bottom */}
        <pointLight position={[0, -5, 5]} intensity={50} color="#ffaa00" distance={15} />

        <group position={[0, -2, 0]}>
          <GrandTree 
            onStarClick={onStarClick} 
            onExplode={onExplode}
            isGenerating={isGenerating} 
            mode={treeMode}
            userImages={userImages}
          />
          <FloatingSparkles count={treeMode === TreeMode.CHAOS ? 300 : 80} />
          
          <ContactShadows resolution={1024} scale={30} blur={2.5} opacity={0.5} far={10} color="#000000" />
        </group>

        {/* Cinematic Post Processing: The "Trump-Style" Glow */}
        <EffectComposer enableNormalPass={false}>
           {/* High threshold bloom: Only the very bright reflections glow */}
           <Bloom 
            luminanceThreshold={1.1} 
            mipmapBlur 
            intensity={2.0} 
            radius={0.6}
            levels={9}
           />
           {/* Secondary softer bloom for atmosphere */}
           <Bloom 
            luminanceThreshold={0.5} 
            intensity={0.4} 
            radius={0.9}
           />
           <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
           <Vignette eskil={false} offset={0.2} darkness={1.0} />
        </EffectComposer>

        <OrbitControls 
            makeDefault
            // In CHAOS mode: Allow full rotation (look up/down freely).
            // In FORMED mode: Allow viewing from top (0.1) down to base (Math.PI / 1.7).
            minPolarAngle={treeMode === TreeMode.CHAOS ? 0 : 0.1} 
            maxPolarAngle={treeMode === TreeMode.CHAOS ? Math.PI : Math.PI / 1.7} 
            
            // Allow panning in chaos to move around properly
            enablePan={treeMode === TreeMode.CHAOS}
            
            // Allow zooming closer in Chaos to fly through particles
            minDistance={treeMode === TreeMode.CHAOS ? 1 : 10}
            maxDistance={treeMode === TreeMode.CHAOS ? 60 : 35}
            
            // Enable auto-rotate ONLY when tree is formed to show it off
            autoRotate={treeMode === TreeMode.FORMED}
            autoRotateSpeed={0.8}
            
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
};