import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Grid, Edges, useTexture, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import Player from './Player';
import { useGameStore, TILE_COLORS } from '../store';

function Sun() {
  const texture = useTexture('https://i.imgur.com/2LA6IRt.png');
  return (
    <mesh position={[0, 100, -800]} rotation={[0, 0, 0]}>
      <planeGeometry args={[300, 300]} />
      <meshBasicMaterial map={texture} transparent fog={false} toneMapped={false} color={[1.2, 1.2, 1.2]} />
    </mesh>
  );
}

function FloatingScreen() {
  const targetColor = useGameStore(s => s.targetColor);
  const countdown = useGameStore(s => s.countdown);
  const gamePhase = useGameStore(s => s.gamePhase);

  const leftGlowTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 256, 0);
      gradient.addColorStop(0, "#000000"); 
      gradient.addColorStop(1, "#FFFFFF"); 
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 2);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const rightGlowTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 256, 0);
      gradient.addColorStop(0, "#FFFFFF"); 
      gradient.addColorStop(1, "#000000"); 
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 2);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  let screenColor = targetColor || "#FF0000";
  if (gamePhase === 'elimination' || gamePhase === 'gameover') {
    screenColor = "#000000";
  }

  return (
    <group position={[0, 10, -40.5]} scale={0.6}>
      {/* Black Outer Border */}
      <mesh>
        <planeGeometry args={[50, 20]} />
        <meshBasicMaterial color="#000000" fog={false} />
      </mesh>
      
      {/* Inner Screen */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[46, 16]} />
        <meshBasicMaterial color={screenColor} fog={false} toneMapped={false} />
      </mesh>
      
      {/* Screen Text */}
      <Text 
        font="https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf"
        position={[0, 0, 0.2]} 
        fontSize={gamePhase === 'countdown' ? 7.2 : 3.6} 
        color={gamePhase === 'elimination' ? "#FF0000" : "#FFFFFF"} 
        outlineWidth={0.1} 
        outlineColor="#000000"
      >
        {gamePhase === 'elimination' ? 'DANGER' : gamePhase === 'gameover' ? 'GAME OVER' : Math.ceil(countdown).toString()}
      </Text>

      {/* Left Glow */}
      <mesh position={[-28, 0, 0.05]}>
        <planeGeometry args={[6, 20]} />
        <meshBasicMaterial color="#00FFFF" alphaMap={leftGlowTex} transparent depthWrite={false} fog={false} />
      </mesh>
      
      {/* Right Glow */}
      <mesh position={[28, 0, 0.05]}>
        <planeGeometry args={[6, 20]} />
        <meshBasicMaterial color="#00FFFF" alphaMap={rightGlowTex} transparent depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

function GameLoop({ tiles }: { tiles: any[] }) {
  const { gamePhase, setGamePhase, countdown, setCountdown, countdownDuration, setCountdownDuration, setTargetColor, targetColor, gameStarted, endGame, setScreenVisible } = useGameStore();
  const { scene } = useThree();

  useFrame((state, delta) => {
    if (!gameStarted) return;
    
    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);
    const screenPos = new THREE.Vector3(0, 10, -40.5);
    const toScreen = screenPos.clone().sub(state.camera.position).normalize();
    const dot = dir.dot(toScreen);
    const isMobile = window.innerWidth < 768;
    setScreenVisible(dot > (isMobile ? 0.6 : 0.4));

    if (gamePhase === 'countdown') {
       if (countdown > 0) {
         setCountdown(countdown - delta);
       } else {
         setGamePhase('elimination');
         setCountdown(3);
       }
    } else if (gamePhase === 'elimination') {
       // Check death
       const playerBody = scene.getObjectByName('player');
       if (playerBody) {
         // player is slightly offset by [0, 1, 0] initially but translation changes
         const pos = playerBody.position; 
         // But wait, position on a Rapier RigidBody might not update seamlessly unless we read from rigid body directly.
         // Let's use position directly for now, or find the tile by world position.
         // The tile grid is from -40 to 40.
         const x = pos.x;
         const z = pos.z;
         
         // Find matching tile
         const matchingTile = tiles.find(t => 
            Math.abs(t.x - x) <= 4 && Math.abs(t.z - z) <= 4
         );
         
         const isGrounded = pos.y < 1.3; // Player rests at ~1.2, so < 1.3 means touching the ground

         if (isGrounded && (!matchingTile || matchingTile.color !== targetColor)) {
           // Player is on wrong tile
           setGamePhase('gameover');
           
           setTimeout(() => {
             useGameStore.getState().endGame();
             setTimeout(() => {
               useGameStore.getState().startGame(); // restart after showing menu for 2s
             }, 2000);
           }, 3000);
           return;
         }
       }

       if (countdown > 0) {
         setCountdown(countdown - delta);
       } else {
         const newDuration = Math.max(1.0, countdownDuration - 0.1);
         setCountdownDuration(newDuration);
         setCountdown(newDuration);
         setTargetColor(TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)]);
         setGamePhase('countdown');
       }
    } else if (gamePhase === 'gameover') {
       // Just wait here
    }
  });

  return null;
}

export default function Scene() {
  const gameStarted = useGameStore(s => s.gameStarted);
  const targetColor = useGameStore(s => s.targetColor);
  const gamePhase = useGameStore(s => s.gamePhase);
  
  const borderAlphaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, "rgba(0, 0, 0, 1)");       // top
      gradient.addColorStop(1, "rgba(255, 255, 255, 1)"); // bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 300; i++) {
      let x = (Math.random() - 0.5) * 800;
      let z = (Math.random() - 0.5) * 800;
      
      // Ensure rocks are outside the 80x80 square spawn area + a small buffer
      if (Math.abs(x) < 55 && Math.abs(z) < 55) {
        if (Math.random() > 0.5) {
          x = (Math.random() > 0.5 ? 1 : -1) * (55 + Math.random() * 345);
        } else {
          z = (Math.random() > 0.5 ? 1 : -1) * (55 + Math.random() * 345);
        }
      }

      const scale = 5 + Math.random() * 10; // Scale between 5 and 15
      const rotation: [number, number, number] = [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ];
      const y = -(scale * 0.25) + Math.random() * (scale * 0.1); // More above ground
      arr.push({ id: `rock-${i}`, x, y, z, scale, rotation });
    }
    return arr;
  }, []);

  const countdownDuration = useGameStore(s => s.countdownDuration);

  const tiles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const color = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
            const x = (i - 4.5) * 8;
            const z = (j - 4.5) * 8;
            arr.push({ id: `${i}-${j}`, x, z, color });
        }
    }
    return arr;
  }, [countdownDuration]);

  return (
    <>
      <fog attach="fog" args={['#7B2CBF', 50, 400]} />
      <ambientLight intensity={1.5} />
      <directionalLight castShadow position={[100, 200, 50]} intensity={1.5} shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-100, 100, 100, -100]} />
      </directionalLight>

      <Sun />
      <FloatingScreen />

      {/* Basic ground plane so the player has something to stand on */}
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
        <CuboidCollider args={[50000, 0.5, 50000]} position={[0, -0.29, 0]} />
        <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100000, 100000]} />
          <meshStandardMaterial color="#10002B" />
        </mesh>
        <Grid 
          infiniteGrid 
          fadeDistance={500}
          fadeStrength={20}
          cellColor="#FF00FF" 
          sectionColor="#FF00FF" 
          cellSize={4} 
          sectionSize={4} 
          cellThickness={2.5}
          sectionThickness={2.5}
          position={[0, 0.2, 0]}
        />
        
        {/* Masking plane to hide pink grid under the square */}
        <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#10002B" />
        </mesh>

        <Grid 
          args={[80, 80]}
          fadeDistance={5000}
          fadeStrength={0}
          cellColor="#000000" 
          sectionColor="#000000" 
          cellSize={8} 
          sectionSize={8} 
          cellThickness={1.25}
          sectionThickness={1.25}
          position={[0, 0.21, 0]}
        />

        {/* 100 Colored Squares */}
        <group position={[0, 0.206, 0]}>
          {tiles.map(tile => {
            const isEliminated = (gamePhase === 'elimination' || gamePhase === 'gameover') && tile.color !== targetColor;
            return (
            <mesh key={tile.id} position={[tile.x, 0, tile.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[8, 8]} />
              <meshStandardMaterial color={isEliminated ? '#000000' : tile.color} transparent opacity={isEliminated ? 1 : 0.6} />
            </mesh>
            );
          })}
        </group>
      </RigidBody>

      {gameStarted && <GameLoop tiles={tiles} />}

      {/* Spawn area outline grid walls */}
      <RigidBody type="fixed" colliders={false} position={[0, 0.855, 0]}>
        <CuboidCollider args={[40, 5, 0.5]} position={[0, 0, -40]} />
        <CuboidCollider args={[40, 5, 0.5]} position={[0, 0, 40]} />
        <CuboidCollider args={[0.5, 5, 40]} position={[-40, 0, 0]} />
        <CuboidCollider args={[0.5, 5, 40]} position={[40, 0, 0]} />
        <mesh position={[0, 0, -40]} rotation={[0, 0, 0]}>
          <planeGeometry args={[80, 2.29]} />
          <meshBasicMaterial color="#00FFFF" alphaMap={borderAlphaTexture} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, 40]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[80, 2.29]} />
          <meshBasicMaterial color="#00FFFF" alphaMap={borderAlphaTexture} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.8} />
        </mesh>
        <mesh position={[-40, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[80, 2.29]} />
          <meshBasicMaterial color="#00FFFF" alphaMap={borderAlphaTexture} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.8} />
        </mesh>
        <mesh position={[40, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[80, 2.29]} />
          <meshBasicMaterial color="#00FFFF" alphaMap={borderAlphaTexture} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* Decorative rocks outside the square */}
      <group>
        {rocks.map(rock => (
          <mesh key={rock.id} position={[rock.x, rock.y, rock.z]} rotation={rock.rotation} scale={rock.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#10002B" />
            <Edges scale={1.0} threshold={15} color="#00FFFF" />
          </mesh>
        ))}
      </group>

      {gameStarted && <Player />}
    </>
  );
}
