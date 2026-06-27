import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [hp, setHp] = useState(100);

  // Expose a way for the React UI to trigger 3D events
  const handleSpawnExaflare = () => {
    if (engineRef.current && engineRef.current.spawnExaflareSequence) {
      engineRef.current.spawnExaflareSequence();
    }
  };

  useEffect(() => {
    setIsLoaded(true);
    engineRef.current = initEngine(mountRef.current, setHp);

    return () => {
      if (engineRef.current) engineRef.current.cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 font-sans select-none">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0"
        onContextMenu={(e) => e.preventDefault()} // Prevent browser menu on right click
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">

        {/* Top HUD */}
        <div className="flex justify-between items-start">
          <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white shadow-lg pointer-events-auto">
            <h1 className="text-xl font-bold text-blue-400 mb-2">FFXIV Mechanic Sim</h1>
            <div className="w-48 bg-gray-800 h-4 rounded-full overflow-hidden border border-gray-900">
              <div
                className={`h-full transition-all duration-200 ${hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(0, hp)}%` }}
              />
            </div>
            <p className="text-sm mt-1 text-gray-300">HP: {hp} / 100</p>
            <p className="text-xs text-gray-400 mt-2">
              WASD: Legacy Movement <br/>
              Right-Click Drag: Turn Camera
            </p>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={handleSpawnExaflare}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded shadow-lg font-bold transition-colors active:scale-95"
            >
              Spawn Exaflares
            </button>
            <button
              onClick={() => setHp(100)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded shadow-lg font-bold transition-colors active:scale-95 text-sm"
            >
              Reset HP
            </button>
          </div>
        </div>

        {/* Loading Screen */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center pointer-events-none">
            <div className="text-white text-2xl font-bold animate-pulse">Loading 3D Engine...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- THREE.JS ENGINE LOGIC --- //

function initEngine(container, updateHpCallback) {
  const THREE = window.THREE;

  // Scene Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111115);

  // Camera Setup
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  let camRadius = 18;
  let camTheta = 0; // Horizontal orbit angle
  let camPhi = Math.PI / 3; // Vertical orbit angle (60 degrees up)

  // Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // --- Environment ---
  const arenaRadius = 12;

  // Floor Grid / Texture
  const floorGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 0.2, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.1;
  scene.add(floor);

  // Arena Border Ring
  const borderGeo = new THREE.RingGeometry(arenaRadius, arenaRadius + 0.3, 64);
  const borderMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.01;
  scene.add(border);

  // Floor Markers (A, 2, B, 3, C, 4, D, 1)
  const markerConfig = [
    { text: 'A', color: '#ff4444' }, // North (-Z)
    { text: '2', color: '#ffff44' }, // NE
    { text: 'B', color: '#ffff44' }, // East (+X)
    { text: '3', color: '#4444ff' }, // SE
    { text: 'C', color: '#4444ff' }, // South (+Z)
    { text: '4', color: '#cc44cc' }, // SW
    { text: 'D', color: '#cc44cc' }, // West (-X)
    { text: '1', color: '#ff4444' }, // NW
  ];

  markerConfig.forEach((m, i) => {
    // 0 is North (-Z), so we start at -PI/2 (or subtract from standard circle math)
    const angle = (i * Math.PI) / 4;
    const r = arenaRadius - 1.5;
    // Standard trigonometric circle rotated so 0 is -Z
    const x = r * Math.sin(angle);
    const z = -r * Math.cos(angle);

    const markerMesh = createFloorMarker(m.text, m.color, THREE);
    markerMesh.position.set(x, 0.05, z);
    scene.add(markerMesh);
  });

  // --- Player ---
  const pRadius = 0.4;
  const pGeo = new THREE.CylinderGeometry(pRadius, pRadius, 1.5, 16);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x00ccff });
  const player = new THREE.Mesh(pGeo, pMat);
  player.position.y = 0.75; // Half height of 1.5
  scene.add(player);

  let playerBaseColor = new THREE.Color(0x00ccff);
  let flashTimer = 0;

  // --- Input State ---
  const keys = { w: false, a: false, s: false, d: false };
  let isRightClicking = false;

  const onKeyDown = (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; };
  const onKeyUp = (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; };

  const onMouseDown = (e) => { if (e.button === 2) isRightClicking = true; };
  const onMouseUp = (e) => { if (e.button === 2) isRightClicking = false; };
  const onMouseMove = (e) => {
    if (isRightClicking) {
      camTheta -= e.movementX * 0.0025; // Slowed down by 50%
      camPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPhi + e.movementY * 0.0025)); // Inverted Y axis and slowed
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  // --- Game State Variables ---
  let lastTime = performance.now();
  let currentHp = 100;
  // Exflare Mechanics
  const exaflares = []; // Track active moving mechanics
  const aoes = []; // Track exact explosions currently active
  const aoeRadius = 3; // 25% of arena diameter (24 / 4 = 6 width, so 3 radius)
  let exaflareSpawnTimeouts = [];

  // Pity system state
  let lastPattern = null;
  let patternRepeatCount = 0;

  // Exaflare visual template
  const explosionGeo = new THREE.CylinderGeometry(aoeRadius, aoeRadius, 0.5, 32);
  const explosionMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6 });

  // Telegraph visual (Red ring that appears 4s before moving)
  const telegraphGeo = new THREE.RingGeometry(aoeRadius - 0.4, aoeRadius, 32);
  const telegraphMat = new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });

  function spawnExaflareSequence() {
    // Clear any pending spawns from a previous click
    exaflareSpawnTimeouts.forEach(clearTimeout);
    exaflareSpawnTimeouts = [];

    const numSets = 6;
    const spawnDelay = 2500; // Exactly 3 seconds between sets spawning

    for (let i = 0; i < numSets; i++) {
      const timeoutId = setTimeout(() => {
        spawnExaflareSet(i);
      }, i * spawnDelay);
      exaflareSpawnTimeouts.push(timeoutId);
    }
  }

  function spawnExaflareSet(setIndex) {
    // Alternates between NW (0, 2, 4) and NE (1, 3, 5)
    const isNorthWest = setIndex % 2 === 0;

    // Direction vectors: NW goes SE (+X, +Z), NE goes SW (-X, +Z)
    const dx = isNorthWest ? 0.707 : -0.707;
    const dz = 0.707;

    // Perpendicular vector for spacing out the parallel lanes
    const px = -dz;
    const pz = dx;

    // Start base position near the edge (15 units from center: 12 arena radius + 3 aoe radius)
    // This perfectly spaces 7 steps of 5 units to finish exactly at the opposite edge (-15)
    const startDist = 15;
    const baseX = -dx * startDist;
    const baseZ = -dz * startDist;

    // Randomize configuration with Pity System:
    let isPatternA = Math.random() < 0.5;
    if (lastPattern === isPatternA) {
      patternRepeatCount++;
      if (patternRepeatCount >= 2) {
        isPatternA = !isPatternA; // Force switch
        patternRepeatCount = 0;
      }
    } else {
      patternRepeatCount = 0;
    }
    lastPattern = isPatternA;

    // Pattern A: (EXA) (EMPTY) (EXA) (EMPTY) -> Lanes at -9 and +3
    // Pattern B: (EMPTY) (EXA) (EMPTY) (EXA) -> Lanes at -3 and +9
    const activeOffsets = isPatternA ? [-9, 3] : [-3, 9];

    // Create the 2 exaflares in this set
    activeOffsets.forEach((offset) => {
      const startX = baseX + px * offset;
      const startZ = baseZ + pz * offset;

      // Spawn the telegraph mesh immediately
      const mesh = new THREE.Mesh(telegraphGeo, telegraphMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(startX, 0.05, startZ);
      scene.add(mesh);

      exaflares.push({
        x: startX,
        z: startZ,
        dx: dx,
        dz: dz,
        stepDistance: 5, // 6 jumps of 5 units = 30 units total distance (from 15 to -15)
        stepDelay: 500, // 0.5s per pulse
        nextStepTime: performance.now() + 4000, // 4 second initial delay
        stepsRemaining: 7, // Exactly 7 pulses
        isTelegraphing: true,
        mesh: mesh
      });
    });
  }

  function handleDamage() {
    flashTimer = 300; // ms to flash red
    currentHp -= 15;
    updateHpCallback(currentHp);
  }

  // --- Render Loop ---
  let animationId;
  const tick = () => {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;

    // 1. Camera Logic & Legacy Movement
    // The arena diameter is 24 (radius 12 * 2). To cross in 7.5 seconds:
    // Speed = 24 / 7.5 = 3.2 units per second.
    // We multiply by (dt / 1000) to ensure frame-rate independent movement.
    const moveSpeed = 3.2 * (dt / 1000);

    // Calculate the camera's flat forward vector
    const camForward = new THREE.Vector3(
      player.position.x - camera.position.x,
      0,
      player.position.z - camera.position.z
    ).normalize();

    // Calculate the flat right vector
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    // Accumulate movement intent based on WASD
    let moveDir = new THREE.Vector3(0, 0, 0);
    if (keys['w']) moveDir.add(camForward);
    if (keys['s']) moveDir.sub(camForward);
    if (keys['a']) moveDir.sub(camRight);
    if (keys['d']) moveDir.add(camRight);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(moveSpeed);
      player.position.add(moveDir);

      // Clamp player to arena radius
      const distFromCenter = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
      if (distFromCenter > arenaRadius - pRadius) {
        const angle = Math.atan2(player.position.z, player.position.x);
        player.position.x = (arenaRadius - pRadius) * Math.cos(angle);
        player.position.z = (arenaRadius - pRadius) * Math.sin(angle);
      }
    }

    // Update Camera Position (orbit around player)
    camera.position.x = player.position.x + camRadius * Math.cos(camPhi) * Math.sin(camTheta);
    camera.position.y = player.position.y + camRadius * Math.sin(camPhi);
    camera.position.z = player.position.z + camRadius * Math.cos(camPhi) * Math.cos(camTheta);
    camera.lookAt(player.position);

    // 2. Process Exaflares
    for (let i = exaflares.length - 1; i >= 0; i--) {
      const exa = exaflares[i];

      if (now >= exa.nextStepTime) {

        // 4 seconds have passed: Transition from Telegraph to Active
        if (exa.isTelegraphing) {
          exa.isTelegraphing = false;
          scene.remove(exa.mesh);
          if (exa.mesh.geometry) exa.mesh.geometry.dispose();
        }

        // Active Moving Phase
        if (!exa.isTelegraphing) {
          // Create an AoE explosion at current position
          const mesh = new THREE.Mesh(explosionGeo, explosionMat);
          mesh.position.set(exa.x, 0.25, exa.z);
          scene.add(mesh);

          aoes.push({
            mesh,
            x: exa.x,
            z: exa.z,
            expiresAt: now + 500, // Explosion lasts 0.5s
            hasDamaged: false
          });

          // Advance to next step
          exa.x += exa.dx * exa.stepDistance;
          exa.z += exa.dz * exa.stepDistance;
          exa.stepsRemaining--;
          exa.nextStepTime = now + exa.stepDelay;

          if (exa.stepsRemaining <= 0) {
            exaflares.splice(i, 1);
          }
        }
      }
    }

    // 3. Process Active Explosions & Collision Detection
    for (let i = aoes.length - 1; i >= 0; i--) {
      const aoe = aoes[i];

      // Collision Math: 2D Circle intersection
      if (!aoe.hasDamaged) {
        const dx = player.position.x - aoe.x;
        const dz = player.position.z - aoe.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < aoeRadius + pRadius) {
          handleDamage();
          aoe.hasDamaged = true;
        }
      }

      // Cleanup expired AoEs
      if (now >= aoe.expiresAt) {
        scene.remove(aoe.mesh);
        aoes.splice(i, 1);
      }
    }

    // 4. Visual Damage Feedback
    if (flashTimer > 0) {
      pMat.color.setHex(0xff0000);
      flashTimer -= dt;
    } else {
      pMat.color.copy(playerBaseColor);
    }

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(tick);
  };

  tick();

  // Resize handler
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // Cleanup function returned to React
  return {
    spawnExaflareSequence,
    cleanup: () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    }
  };
}

// --- HELPER: Create standard FFXIV Waymarks --- //
function createFloorMarker(text, colorHex, THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Draw circle border
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = colorHex;
  ctx.font = 'bold 130px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 145);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false, // Prevents flickering against the floor
  });

  const planeGeo = new THREE.PlaneGeometry(3, 3);
  const plane = new THREE.Mesh(planeGeo, material);
  plane.rotation.x = -Math.PI / 2; // Lay flat

  return plane;
}
