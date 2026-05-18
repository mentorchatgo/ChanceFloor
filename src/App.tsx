/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment, KeyboardControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Vignette, Pixelation } from '@react-three/postprocessing';
import Scene from './components/Scene';
import UI from './components/UI';

export default function App() {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden select-none touch-none" style={{ background: 'linear-gradient(to top, #FFFFFF 0%, #FFFF00 50%, #FF69B4 75%, #240046 100%)' }}>
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
          { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
          { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
          { name: 'right', keys: ['ArrowRight', 'KeyD'] },
          { name: 'jump', keys: ['Space'] },
          { name: 'crouch', keys: ['ShiftLeft', 'KeyC'] },
        ]}
      >
        <Canvas shadows gl={{ antialias: false }}>
          <PerspectiveCamera makeDefault position={[0, 3, 7]} />
          <Suspense fallback={null}>
            <Environment preset="night" background={false} />
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 20, -5]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} />
            <Physics>
              <Scene />
            </Physics>
            <EffectComposer>
              <Vignette eskil={false} offset={0.1} darkness={0.8} />
              <Pixelation granularity={3} />
            </EffectComposer>
          </Suspense>
        </Canvas>
        <UI />
      </KeyboardControls>
      
      {/* SVG filter for pixelation of 2D DOM */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <filter id="pixelate" x="-10%" y="-10%" width="120%" height="120%">
          <feFlood x="1" y="1" height="1" width="1" />
          <feComposite width="3" height="3" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="1.5" />
        </filter>
        <filter id="pixelate-text" x="-10%" y="-10%" width="120%" height="120%">
          <feFlood x="1" y="1" height="1" width="1" />
          <feComposite width="1.5" height="1.5" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="0.75" />
        </filter>
      </svg>

      {/* Global CRT / Vignette Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-[9999] mix-blend-multiply" 
        style={{ 
          backgroundImage: `
            radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)
          `,
          backgroundSize: '100% 100%' 
        }} 
      />
    </div>
  );
}
