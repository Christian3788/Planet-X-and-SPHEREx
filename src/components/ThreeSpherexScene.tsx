/**
 * SPHEREx SkyShift - 3D Interactive Three.js Spacecraft & Orbital Mission Simulator
 * Complies with the Three.js skill constitution:
 * - Composite 3-12 part procedural model of the SPHEREx Space Observatory
 * - Studio PBR lighting (ACESFilmicToneMapping, RoomEnvironment with PMREMGenerator)
 * - Zero external texture dependencies (100% procedural CanvasTexture & materials)
 * - Exploded view mechanism with silky-smooth exponential damping
 * - Orbit mode with Earth, sun-synchronous orbit, scan cone, and 3D celestial target pins
 * - Collapsible bottom control dock (<= 15% viewport footprint)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TargetPreset } from '../types/astronomy';
import { BENCHMARK_TARGETS } from '../data/spherexTargets';
import {
  Telescope,
  Layers,
  Orbit,
  Maximize2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Compass,
  Eye,
  Crosshair,
} from 'lucide-react';

// Scratch math helpers outside animation loop to prevent GC pressure
const _vec3 = new THREE.Vector3();
const _targetCameraPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

// Procedural CanvasTexture generator for Solar Cell Grid
function createSolarPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark deep navy blue silicon base
  ctx.fillStyle = '#0a192f';
  ctx.fillRect(0, 0, 512, 512);

  // Cell grid lines
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 3;
  const cols = 8;
  const rows = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, 512);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(512, r * cellH);
    ctx.stroke();
  }

  // Fine busbar silver contacts
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 1;
  for (let c = 0; c < cols; c++) {
    const xMid = (c + 0.5) * cellW;
    ctx.beginPath();
    ctx.moveTo(xMid, 0);
    ctx.lineTo(xMid, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural CanvasTexture generator for MLI Gold Foil Thermal Insulation
function createGoldFoilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle crinkled foil noise
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 35;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.2));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Procedural Earth Texture (Continents & Oceans)
function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 512);

  // Procedural continental shapes
  ctx.fillStyle = '#1e293b';
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * 1024;
    const cy = 100 + Math.random() * 312;
    const r = 40 + Math.random() * 90;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coastlines & clouds
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * 1024;
    const cy = 120 + Math.random() * 280;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + Math.random() * 60, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface ThreeSpherexSceneProps {
  onSelectBenchmark: (target: TargetPreset) => void;
  activeBenchmarkId?: string;
}

export const ThreeSpherexScene: React.FC<ThreeSpherexSceneProps> = ({
  onSelectBenchmark,
  activeBenchmarkId,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // UI Dock state
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [sceneMode, setSceneMode] = useState<'observatory' | 'orbital' | 'exploded'>('observatory');
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedTarget, setSelectedTarget] = useState<string>(activeBenchmarkId || 'barnards-star');

  // Three.js References for Animation Loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const satelliteGroupRef = useRef<THREE.Group | null>(null);
  const explodedPartsRef = useRef<{ obj: THREE.Object3D; basePos: THREE.Vector3; explodeDir: THREE.Vector3 }[]>([]);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const scanConeRef = useRef<THREE.Mesh | null>(null);
  const targetMarkersRef = useRef<{ id: string; mesh: THREE.Mesh; pos: THREE.Vector3 }[]>([]);

  // Smooth target explosion factor ref
  const targetExplodeRef = useRef<number>(0);
  const currentExplodeRef = useRef<number>(0);

  // Sync state with ref
  useEffect(() => {
    targetExplodeRef.current = sceneMode === 'exploded' ? (explodedFactor > 0 ? explodedFactor : 0.8) : 0;
  }, [sceneMode, explodedFactor]);

  // Handle Mount & Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x05070d, 0.008);
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    camera.position.set(16, 12, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 2. Studio PBR Environment Map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. OrbitControls with smooth damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 250;
    controls.minDistance = 4;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 4. Lighting Rig (3-Point balanced studio PBR rig)
    // Cool ambient hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2);
    scene.add(hemiLight);

    // Warm Key Directional Light (Sunlight in Space)
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    dirLight.position.set(35, 40, 25);
    dirLight.castShadow = !isSoftwareGl;
    if (dirLight.shadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 120;
      dirLight.shadow.camera.left = -25;
      dirLight.shadow.camera.right = 25;
      dirLight.shadow.camera.top = 25;
      dirLight.shadow.camera.bottom = -25;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    // Subtle Cyan Rim/Accent Light
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    rimLight.position.set(-30, -10, -30);
    scene.add(rimLight);

    // 5. Build Procedural Model of the SPHEREx Space Observatory (3-12 Component Group)
    const satelliteGroup = new THREE.Group();
    satelliteGroupRef.current = satelliteGroup;
    scene.add(satelliteGroup);

    const solarTex = createSolarPanelTexture();
    const goldTex = createGoldFoilTexture();

    // Materials
    const goldShieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      map: goldTex,
      metalness: 0.88,
      roughness: 0.22,
      bumpScale: 0.05,
    });

    const innerShieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Polished Aluminum / Titanium
      metalness: 0.95,
      roughness: 0.15,
    });

    const busMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569, // Aerospace Dark Alloy
      metalness: 0.75,
      roughness: 0.35,
    });

    const solarMaterial = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.9,
      roughness: 0.15,
    });

    const opticLensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4, // Coated Infrared Telescope Optics
      metalness: 0.1,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.4 : 0.95,
      ior: 1.55,
      clearcoat: 1.0,
    });

    const radiatorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Cryogenic radiator white paint
      metalness: 0.2,
      roughness: 0.8,
    });

    explodedPartsRef.current = [];

    // Part 1: Outer Photon Shield Cone (Tier 1)
    const outerConeGeo = new THREE.CylinderGeometry(5.2, 3.8, 4.2, 48, 1, true);
    const outerCone = new THREE.Mesh(outerConeGeo, goldShieldMaterial);
    outerCone.position.set(0, 3.2, 0);
    outerCone.castShadow = !isSoftwareGl;
    satelliteGroup.add(outerCone);
    explodedPartsRef.current.push({
      obj: outerCone,
      basePos: new THREE.Vector3(0, 3.2, 0),
      explodeDir: new THREE.Vector3(0, 5.0, 0),
    });

    // Part 2: Middle Photon Shield Cone (Tier 2)
    const midConeGeo = new THREE.CylinderGeometry(4.1, 2.9, 3.8, 48, 1, true);
    const midCone = new THREE.Mesh(midConeGeo, innerShieldMaterial);
    midCone.position.set(0, 2.6, 0);
    midCone.castShadow = !isSoftwareGl;
    satelliteGroup.add(midCone);
    explodedPartsRef.current.push({
      obj: midCone,
      basePos: new THREE.Vector3(0, 2.6, 0),
      explodeDir: new THREE.Vector3(0, 3.2, 0),
    });

    // Part 3: Inner Photon Shield Cone (Tier 3)
    const innerConeGeo = new THREE.CylinderGeometry(3.0, 2.0, 3.4, 48, 1, true);
    const innerCone = new THREE.Mesh(innerConeGeo, innerShieldMaterial);
    innerCone.position.set(0, 2.0, 0);
    satelliteGroup.add(innerCone);
    explodedPartsRef.current.push({
      obj: innerCone,
      basePos: new THREE.Vector3(0, 2.0, 0),
      explodeDir: new THREE.Vector3(0, 1.8, 0),
    });

    // Part 4: Telescope Optical Tube Assembly (OTA) & Primary Mirror
    const otaGroup = new THREE.Group();
    const otaBarrelGeo = new THREE.CylinderGeometry(1.4, 1.4, 3.2, 32);
    const otaBarrel = new THREE.Mesh(otaBarrelGeo, busMaterial);
    otaGroup.add(otaBarrel);

    // 20cm Ritchey-Chrétien Primary Aperture / Lens
    const lensGeo = new THREE.CircleGeometry(1.35, 32);
    const lens = new THREE.Mesh(lensGeo, opticLensMaterial);
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 1.61;
    otaGroup.add(lens);

    // Spider vanes for secondary mirror
    const spiderGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.7, 8);
    const spider1 = new THREE.Mesh(spiderGeo, innerShieldMaterial);
    spider1.rotation.z = Math.PI / 2;
    spider1.position.y = 1.5;
    otaGroup.add(spider1);
    const spider2 = new THREE.Mesh(spiderGeo, innerShieldMaterial);
    spider2.rotation.x = Math.PI / 2;
    spider2.position.y = 1.5;
    otaGroup.add(spider2);

    otaGroup.position.set(0, 1.2, 0);
    satelliteGroup.add(otaGroup);
    explodedPartsRef.current.push({
      obj: otaGroup,
      basePos: new THREE.Vector3(0, 1.2, 0),
      explodeDir: new THREE.Vector3(0, 0.5, 0),
    });

    // Part 5: Hexagonal Spacecraft Bus
    const busGeo = new THREE.CylinderGeometry(2.4, 2.4, 2.2, 6);
    const bus = new THREE.Mesh(busGeo, busMaterial);
    bus.position.set(0, -1.5, 0);
    bus.castShadow = !isSoftwareGl;
    satelliteGroup.add(bus);
    explodedPartsRef.current.push({
      obj: bus,
      basePos: new THREE.Vector3(0, -1.5, 0),
      explodeDir: new THREE.Vector3(0, -1.2, 0),
    });

    // Part 6: Passive Cryogenic V-Groove Radiators (55 Kelvin Coolers)
    const radiatorGeo = new THREE.BoxGeometry(4.8, 0.1, 1.6);
    const radiator = new THREE.Mesh(radiatorGeo, radiatorMaterial);
    radiator.position.set(0, -0.3, 1.8);
    radiator.rotation.x = 0.3;
    satelliteGroup.add(radiator);
    explodedPartsRef.current.push({
      obj: radiator,
      basePos: new THREE.Vector3(0, -0.3, 1.8),
      explodeDir: new THREE.Vector3(0, 0, 2.5),
    });

    // Part 7: Solar Array Wings (Left & Right)
    const solarWingGeo = new THREE.BoxGeometry(5.2, 0.12, 1.8);
    // Left Wing
    const leftWing = new THREE.Mesh(solarWingGeo, solarMaterial);
    leftWing.position.set(-4.8, -1.4, 0);
    leftWing.castShadow = !isSoftwareGl;
    satelliteGroup.add(leftWing);
    explodedPartsRef.current.push({
      obj: leftWing,
      basePos: new THREE.Vector3(-4.8, -1.4, 0),
      explodeDir: new THREE.Vector3(-3.5, 0, 0),
    });

    // Right Wing
    const rightWing = new THREE.Mesh(solarWingGeo, solarMaterial);
    rightWing.position.set(4.8, -1.4, 0);
    rightWing.castShadow = !isSoftwareGl;
    satelliteGroup.add(rightWing);
    explodedPartsRef.current.push({
      obj: rightWing,
      basePos: new THREE.Vector3(4.8, -1.4, 0),
      explodeDir: new THREE.Vector3(3.5, 0, 0),
    });

    // Part 8: High Gain Communications Dish
    const dishGeo = new THREE.SphereGeometry(0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dish = new THREE.Mesh(dishGeo, goldShieldMaterial);
    dish.position.set(0, -2.6, 1.4);
    dish.rotation.x = Math.PI * 0.75;
    satelliteGroup.add(dish);
    explodedPartsRef.current.push({
      obj: dish,
      basePos: new THREE.Vector3(0, -2.6, 1.4),
      explodeDir: new THREE.Vector3(0, -2.5, 1.5),
    });

    // 6. Orbital Mode Elements (Earth globe, scan cone, orbit ring)
    const orbitGroup = new THREE.Group();
    orbitGroupRef.current = orbitGroup;
    orbitGroup.visible = false;
    scene.add(orbitGroup);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(32, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: createEarthTexture(),
      roughness: 0.8,
      metalness: 0.1,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, -42, 0);
    orbitGroup.add(earth);

    // Earth Atmosphere Glow Ring
    const atmoGeo = new THREE.SphereGeometry(33.2, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.position.set(0, -42, 0);
    orbitGroup.add(atmo);

    // Orbital Orbit Path Ring
    const orbitPathGeo = new THREE.TorusGeometry(46, 0.12, 16, 100);
    const orbitPathMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.5,
    });
    const orbitPath = new THREE.Mesh(orbitPathGeo, orbitPathMat);
    orbitPath.rotation.x = Math.PI / 2;
    orbitPath.position.set(0, -42, 0);
    orbitGroup.add(orbitPath);

    // SPHEREx All-Sky Scan Cone (FOV Beam)
    const scanConeGeo = new THREE.ConeGeometry(8, 22, 32, 1, true);
    const scanConeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const scanCone = new THREE.Mesh(scanConeGeo, scanConeMat);
    scanCone.position.set(0, 15, 0);
    scanConeRef.current = scanCone;
    satelliteGroup.add(scanCone);

    // 7. 3D Celestial Targets Pins around Sphere
    targetMarkersRef.current = [];
    const sphereRadius = 65;

    BENCHMARK_TARGETS.forEach((tgt, idx) => {
      // Map RA/Dec to 3D Sphere Coordinates
      const phi = (90 - tgt.dec) * (Math.PI / 180);
      const theta = (tgt.ra + 180) * (Math.PI / 180);

      const px = sphereRadius * Math.sin(phi) * Math.cos(theta);
      const py = sphereRadius * Math.cos(phi);
      const pz = sphereRadius * Math.sin(phi) * Math.sin(theta);

      const markerGeo = new THREE.OctahedronGeometry(1.4, 0);
      const markerMat = new THREE.MeshBasicMaterial({
        color: tgt.id === 'wise-0855' ? 0x06b6d4 : tgt.isVariable ? 0xf43f5e : 0xf59e0b,
      });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.set(px, py, pz);
      scene.add(markerMesh);

      // Connecting target line to center
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(px, py, pz),
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x334155,
        dashSize: 2,
        gapSize: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      scene.add(line);

      targetMarkersRef.current.push({
        id: tgt.id,
        mesh: markerMesh,
        pos: new THREE.Vector3(px, py, pz),
      });
    });

    // 8. Background Deep Stars Particles (1000 stars via BufferGeometry)
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 250 + Math.random() * 200;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop with Exponential Damping
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Smoothly interpolate exploded parts
      currentExplodeRef.current = THREE.MathUtils.damp(
        currentExplodeRef.current,
        targetExplodeRef.current,
        6,
        delta
      );

      const exp = currentExplodeRef.current;
      explodedPartsRef.current.forEach((part) => {
        part.obj.position.copy(part.basePos).addScaledVector(part.explodeDir, exp);
      });

      // Auto-rotation of observatory when enabled
      if (satelliteGroupRef.current) {
        if (autoRotate && sceneMode !== 'orbital') {
          satelliteGroupRef.current.rotation.y += delta * 0.25;
        }
      }

      // Orbital scan simulation
      if (orbitGroupRef.current && sceneMode === 'orbital') {
        orbitGroup.rotation.y += delta * 0.15;
        if (satelliteGroupRef.current) {
          satelliteGroupRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.8;
        }
      }

      // Pulse scan cone opacity
      if (scanConeRef.current) {
        const mat = scanConeRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.18 + Math.sin(clock.elapsedTime * 2.5) * 0.08;
      }

      // Rotate target octahedron pins
      targetMarkersRef.current.forEach((tm) => {
        tm.mesh.rotation.x += delta * 0.8;
        tm.mesh.rotation.y += delta * 1.2;
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate, sceneMode]);

  // Handle Aiming Camera at a Target Benchmark
  const handleAimAtBenchmark = useCallback((targetId: string) => {
    setSelectedTarget(targetId);
    const tm = targetMarkersRef.current.find((m) => m.id === targetId);
    if (!tm || !cameraRef.current || !controlsRef.current) return;

    // Smoothly orbit camera to focus on this target direction
    const dir = tm.pos.clone().normalize();
    _targetCameraPos.copy(dir).multiplyScalar(-24).add(new THREE.Vector3(0, 8, 0));
    _targetLookAt.copy(tm.pos);

    // Aim the observatory's telescope axis toward target
    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.lookAt(tm.pos.x, tm.pos.y, tm.pos.z);
    }

    const tgtObj = BENCHMARK_TARGETS.find((b) => b.id === targetId);
    if (tgtObj) {
      onSelectBenchmark(tgtObj);
    }
  }, [onSelectBenchmark]);

  // Camera preset buttons
  const setCameraPreset = (preset: 'aperture' | 'isometric' | 'side' | 'earth') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    if (preset === 'aperture') {
      cameraRef.current.position.set(0, 16, 0.01);
      controls.target.set(0, 0, 0);
    } else if (preset === 'isometric') {
      cameraRef.current.position.set(16, 12, 22);
      controls.target.set(0, 0, 0);
    } else if (preset === 'side') {
      cameraRef.current.position.set(24, 2, 0);
      controls.target.set(0, 0, 0);
    } else if (preset === 'earth') {
      cameraRef.current.position.set(0, 20, 60);
      controls.target.set(0, -10, 0);
    }
  };

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Floating Badge (Minimal Title & Mission Mode) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
          <Telescope className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">SPHEREx 3D Observatory</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-400 font-mono text-[11px] uppercase">
            {sceneMode === 'exploded'
              ? 'Exploded Cryogenic Assembly'
              : sceneMode === 'orbital'
              ? 'Sun-Synchronous Scan Orbit'
              : 'PBR Satellite Engineering'}
          </span>
        </div>
      </div>

      {/* Top Right: Quick Reset & Preset Buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
            autoRotate
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
          }`}
        >
          <RotateCw className="w-3 h-3" />
          <span>Auto Orbit</span>
        </button>

        <button
          onClick={() => setCameraPreset('isometric')}
          className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Ergonomic Floating Bottom Dock (<= 15% footprint as specified in Three.js skill) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl flex flex-col items-center">
        {/* Collapse / Expand Tab Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="px-3 py-1 bg-slate-900/95 border border-slate-800 border-b-0 rounded-t-lg text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors shadow-lg"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Expand 3D Mission Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Dock Surface */}
        {!isDockCollapsed && (
          <div className="w-full bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xl text-xs text-slate-200">
            {/* Row 1: Mode Switches & Camera Perspectives */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Scene Modes */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-medium">
                <button
                  onClick={() => {
                    setSceneMode('observatory');
                    if (orbitGroupRef.current) orbitGroupRef.current.visible = false;
                  }}
                  className={`px-3 py-1 rounded transition-colors ${
                    sceneMode === 'observatory'
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Observatory Structure
                </button>
                <button
                  onClick={() => {
                    setSceneMode('exploded');
                    if (orbitGroupRef.current) orbitGroupRef.current.visible = false;
                  }}
                  className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    sceneMode === 'exploded'
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Exploded View</span>
                </button>
                <button
                  onClick={() => {
                    setSceneMode('orbital');
                    if (orbitGroupRef.current) orbitGroupRef.current.visible = true;
                    setCameraPreset('earth');
                  }}
                  className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    sceneMode === 'orbital'
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Orbit className="w-3 h-3" />
                  <span>Earth Scan Orbit</span>
                </button>
              </div>

              {/* Exploded Slider (when in exploded mode) */}
              {sceneMode === 'exploded' && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Layer Separation:</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={explodedFactor}
                    onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                    className="w-28 h-1.5 bg-slate-950 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-cyan-300">{(explodedFactor * 100).toFixed(0)}%</span>
                </div>
              )}

              {/* Camera Presets */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-[11px]">
                <button
                  onClick={() => setCameraPreset('isometric')}
                  className="px-2 py-0.5 rounded text-slate-400 hover:text-white"
                >
                  3/4 Angle
                </button>
                <button
                  onClick={() => setCameraPreset('aperture')}
                  className="px-2 py-0.5 rounded text-slate-400 hover:text-white"
                >
                  Telescope Aperture
                </button>
                <button
                  onClick={() => setCameraPreset('side')}
                  className="px-2 py-0.5 rounded text-slate-400 hover:text-white"
                >
                  Solar Wing
                </button>
              </div>
            </div>

            {/* Row 2: 3D Benchmark Target Aiming Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                  <Crosshair className="w-3 h-3 text-cyan-400" />
                  <span>Aim Telescope at Benchmark:</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {BENCHMARK_TARGETS.slice(0, 5).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleAimAtBenchmark(b.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        selectedTarget === b.id
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Notice the 3 concentric conical photon shields passively radiating heat to 55 Kelvin.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
