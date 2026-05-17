import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { useKeyboardControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { MODELS } from '../constants';
import { useGameStore } from '../store';

export default function Player() {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls();
  const { scene, animations } = useGLTF(MODELS.player);
  const { actions } = useAnimations(animations, group);
  const { camera } = useThree();

  useEffect(() => {
    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({ color: '#000000' });
      }
    });

    const idleAction = actions['Idle'] || actions['idle'];
    if (idleAction) {
      idleAction.play();
    } else if (actions && Object.keys(actions).length > 0) {
      actions[Object.keys(actions)[0]]?.play();
    }
  }, [actions, scene]);

  useFrame((state, delta) => {
    if (!body.current) return;
    
    const { gamePhase, gameStarted } = useGameStore.getState();
    
    if (gamePhase === 'gameover' || !gameStarted) {
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    
    const keys = getKeys();
    const mobileControls = useGameStore.getState().mobileControls;
    const speed = 12; // Slower speed
    
    const velocity = body.current.linvel();
    
    // Input direction
    let inputX = 0;
    let inputZ = 0;
    let isJumping = (keys as any).jump || mobileControls.jump;
    
    if (keys.forward || mobileControls.forward) inputZ += 1;
    if (keys.backward || mobileControls.backward) inputZ -= 1;
    if (keys.left || mobileControls.left) inputX += 1;
    if (keys.right || mobileControls.right) inputX -= 1;

    let currentSpeed = speed;

    const currentRot = body.current.rotation();
    const currentQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);

    if (inputX !== 0) {
      const turnSpeed = 3;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), inputX * turnSpeed * delta);
      currentQuat.multiply(q);
      body.current.setRotation(currentQuat, true);
    }

    let moveX = 0;
    let moveZ = 0;
    const isMoving = inputZ !== 0;

    if (isMoving) {
      // Character's local forward is -Z
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentQuat);
      moveX = forward.x * currentSpeed * inputZ;
      moveZ = forward.z * currentSpeed * inputZ;
    }
    
    // Jump logic
    let moveY = velocity.y;
    const isGrounded = Math.abs(velocity.y) < 0.1;
    if (isJumping && isGrounded) {
      moveY = 28;
    }

    body.current.setLinvel({ x: moveX, y: moveY, z: moveZ }, true);
    
    const isAnimating = inputZ !== 0 || inputX !== 0;

    if (actions) {
      const runAction = actions['Run'] || actions['run'];
      const idleAction = actions['Idle'] || actions['idle'];
      
      if (!isGrounded) {
        if (runAction) {
          if (!runAction.isRunning()) {
            runAction.reset().fadeIn(0.2).play();
            idleAction?.fadeOut(0.2);
          }
          runAction.setEffectiveTimeScale(0.3);
        }
      } else if (isAnimating) {
        if (runAction) {
          if (!runAction.isRunning()) {
            runAction.reset().fadeIn(0.2).play();
            idleAction?.fadeOut(0.2);
          }
          runAction.setEffectiveTimeScale(inputZ < 0 ? -1 : 1);
        }
      } else {
        if (idleAction && !idleAction.isRunning()) {
          idleAction.reset().fadeIn(0.2).play();
          runAction?.fadeOut(0.2);
        }
      }
    }

    // Third person camera tracking always behind the player's rotation
    const playerPos = body.current.translation();
    const playerRot = body.current.rotation();
    
    const pPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    
    const cameraOffset = new THREE.Vector3(0, 4, 10);
    cameraOffset.applyQuaternion(new THREE.Quaternion(playerRot.x, playerRot.y, playerRot.z, playerRot.w));
    
    const targetCameraPos = new THREE.Vector3().addVectors(pPos, cameraOffset);
    camera.position.lerp(targetCameraPos, 0.1);
    camera.lookAt(pPos.x, pPos.y + 3.4, pPos.z);
  });

  return (
    <RigidBody ref={body} colliders={false} position={[0, 1, 0]} mass={2} linearDamping={5} gravityScale={3} lockRotations name="player">
      <CuboidCollider args={[1, 1, 1]} />
      <group ref={group}>
        <primitive object={scene} scale={[1.5, 1.5, 1.5]} position={[0, -0.6, 0]} rotation={[0, Math.PI, 0]} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(MODELS.player);
