import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';
import { BIOMES } from '../config/biomes.js';

/**
 * LevelGenerator - High-detail procedural environment generator featuring sci-fi corridor architecture,
 * neon lane runway strips, biome-specific scenery structures, and animated obstacles.
 */
export class LevelGenerator {
  constructor(scene, particles, audio) {
    this.scene = scene;
    this.particles = particles;
    this.audio = audio;

    this.activeChunks = [];
    this.currentChunkIndex = 0;
    this.currentBiomeIndex = 0;

    this.obstacles = [];
    this.coins = [];
    this.powerups = [];

    this.ambientParticles = null;
    this.ambientVelocities = null;
    this.ambientPhases = null;
    this.ambientCount = 0;
    this.lastUpdateT = 0;
    this.lastPlayerZ = 0;

    this.initSharedResources();
  }

  initSharedResources() {
    this.ambientGeo = new THREE.BufferGeometry();
    this.ambientMat = new THREE.PointsMaterial({
      size: 0.18,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true
    });
    this.ambientParticles = null;

    this.materials = {
      floor: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.2, flatShading: true }),
      ceiling: new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8, metalness: 0.2, flatShading: true }),
      laneStripe: new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6 }),
      archStructure: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4, flatShading: true }),
      archNeon: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      barrierFrame: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, flatShading: true }),
      barrierHazard: new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, emissive: 0x991b1b, emissiveIntensity: 0.6, flatShading: true }),
      barrierNeonGlow: new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 }),
      laserWall: new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 }),
      spike: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5, flatShading: true }),
      spikeTip: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      droneBody: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.6, flatShading: true }),
      droneEye: new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
      droneThrusterMat: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }),
      coin: new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.15, flatShading: true }),
      coinRing: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      coinGlowMat: new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }),
      gravCoin: new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.85, roughness: 0.1, flatShading: true }),
      gravRing: new THREE.MeshBasicMaterial({ color: 0xe879f9 }),
      emeraldCoin: new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8, roughness: 0.15, flatShading: true }),
      emeraldRing: new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }),
      diamondCoin: new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.8, roughness: 0.15, flatShading: true }),
      diamondRing: new THREE.MeshBasicMaterial({ color: 0xa5f3fc }),
      rubyCoin: new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.8, roughness: 0.15, emissive: 0x991b1b, emissiveIntensity: 0.5, flatShading: true }),
      rubyRing: new THREE.MeshBasicMaterial({ color: 0xfca5a5 }),
      powerupGlowMat: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }),
      sceneryPrimary: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6, metalness: 0.2, flatShading: true }),
      scenerySecondary: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5, flatShading: true }),
      sceneryRock: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, flatShading: true }),
      sceneryGlow: new THREE.MeshBasicMaterial({ color: 0x34d399 }),
      neonSignMat: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5, flatShading: true }),
      neonSignGlowMat: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }),
      cableMat: new THREE.MeshBasicMaterial({ color: 0x334155 }),
      glowPillarMat: new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 }),
      glowPillarBaseMat: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, flatShading: true }),
      ventMat: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4, flatShading: true }),
      ventGlowMat: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      floorLightMat: new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 }),
      sceneryBush: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6, flatShading: true }),
      sceneryDune: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, flatShading: true }),
      sceneryIceSpike: new THREE.MeshStandardMaterial({ color: 0xa5f3fc, roughness: 0.3, flatShading: true }),
      sceneryMagmaPool: new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.6 }),
      powerups: {
        shield: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
        magnet: new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
        multiplier: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
        slowmo: new THREE.MeshBasicMaterial({ color: 0x22c55e }),
        ghost: new THREE.MeshBasicMaterial({ color: 0xa855f7 }),
        overdrive: new THREE.MeshBasicMaterial({ color: 0xf97316 })
      }
    };

    this.geos = {
      chunkPlatform: new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 3 + 1.6, 0.5, CONFIG.CHUNK_LENGTH),
      laneDivider: new THREE.BoxGeometry(0.08, 0.02, CONFIG.CHUNK_LENGTH),
      railBeam: new THREE.BoxGeometry(0.25, 0.35, CONFIG.CHUNK_LENGTH),
      railGlow: new THREE.BoxGeometry(0.06, 0.08, CONFIG.CHUNK_LENGTH),
      archPillar: new THREE.BoxGeometry(0.45, CONFIG.CEILING_HEIGHT + 0.5, 0.45),
      archBeam: new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 3 + 1.8, 0.45, 0.45),
      archSign: new THREE.BoxGeometry(2.0, 0.2, 0.1),
      spikeBase: new THREE.CylinderGeometry(0.35, 0.45, 0.3, 5),
      spikeCone: new THREE.ConeGeometry(0.38, 0.85, 5),
      hangingCone: new THREE.ConeGeometry(0.38, 0.85, 5),
      barrierPylon: new THREE.BoxGeometry(0.28, 0.8, 0.28),
      barrierBar: new THREE.BoxGeometry(2.4, 0.32, 0.18),
      barrierNeonEdge: new THREE.BoxGeometry(2.44, 0.06, 0.22),
      highBarrierBar: new THREE.BoxGeometry(2.4, 0.4, 0.2),
      fullLaserGrid: new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 3 + 0.8, 2.7, 0.15),
      laserGeneratorPylon: new THREE.BoxGeometry(0.4, 2.8, 0.4),
      laserScanLine: new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 3 + 0.8, 0.08, 0.16),
      droneOcta: new THREE.OctahedronGeometry(0.5, 0),
      droneRing: new THREE.TorusGeometry(0.8, 0.04, 4, 12),
      droneInnerRing: new THREE.TorusGeometry(0.62, 0.03, 4, 12),
      droneEye: new THREE.SphereGeometry(0.18, 6, 6),
      droneThruster: new THREE.ConeGeometry(0.16, 0.3, 6),
      coinCore: new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8),
      coinRim: new THREE.TorusGeometry(0.38, 0.04, 4, 12),
      coinGlowDisc: new THREE.CircleGeometry(0.55, 12),
      diamondCore: new THREE.OctahedronGeometry(0.35, 0),
      rubyCore: new THREE.DodecahedronGeometry(0.35, 0),
      powerup: new THREE.OctahedronGeometry(0.5, 0),
      powerupGlowDisc: new THREE.CircleGeometry(0.7, 10),
      treeTrunk: new THREE.CylinderGeometry(0.25, 0.4, 1.8, 5),
      treeCone: new THREE.ConeGeometry(1.3, 3.2, 5),
      treeCrystal: new THREE.DodecahedronGeometry(0.9, 0),
      sceneryPyramid: new THREE.ConeGeometry(1.6, 3.6, 4),
      sceneryRock: new THREE.DodecahedronGeometry(1.2, 0),
      sceneryPillar: new THREE.BoxGeometry(0.8, 4.2, 0.8),
      neonSign: new THREE.BoxGeometry(1.6, 0.5, 0.1),
      neonSignGlow: new THREE.BoxGeometry(1.4, 0.3, 0.05),
      cable: new THREE.CylinderGeometry(0.03, 0.03, 1, 4),
      glowPillar: new THREE.CylinderGeometry(0.15, 0.15, 2.5, 6),
      glowPillarBase: new THREE.CylinderGeometry(0.3, 0.4, 0.2, 6),
      ventGrille: new THREE.BoxGeometry(0.5, 0.5, 0.1),
      ventSlat: new THREE.BoxGeometry(0.4, 0.06, 0.12),
      energyCable: new THREE.CylinderGeometry(0.05, 0.05, 1, 4),
      floorLight: new THREE.BoxGeometry(0.3, 0.06, 0.3),
      bush: new THREE.IcosahedronGeometry(0.4, 0),
      dune: new THREE.ConeGeometry(1.2, 0.6, 4),
      iceSpike: new THREE.ConeGeometry(0.3, 1.0, 4),
      magmaPool: new THREE.CircleGeometry(0.8, 6)
    };

    this.geos.coinCore.rotateX(Math.PI / 2);
    this.geos.diamondCore.rotateX(Math.PI / 2);
    this.geos.rubyCore.rotateX(Math.PI / 2);
    this.geos.hangingCone.rotateX(Math.PI);
    this.geos.coinGlowDisc.rotateX(-Math.PI / 2);
    this.geos.powerupGlowDisc.rotateX(-Math.PI / 2);
    this.geos.droneThruster.rotateX(Math.PI);
  }

  setBiome(biomeIndex) {
    this.currentBiomeIndex = biomeIndex % BIOMES.length;
    const b = BIOMES[this.currentBiomeIndex];

    this.materials.floor.color.setHex(0x0f172a);
    this.materials.ceiling.color.setHex(0x090d16);
    this.materials.laneStripe.color.setHex(b.accentColor);
    this.materials.archNeon.color.setHex(b.accentColor);
    this.materials.barrierHazard.color.setHex(b.hazardColor);
    this.materials.barrierNeonGlow.color.setHex(b.hazardColor);
    this.materials.spikeTip.color.setHex(b.hazardColor);

    // Scenery color shifts per biome
    if (b.id === 'neon_meadows') {
      this.materials.sceneryPrimary.color.setHex(0x10b981);
      this.materials.scenerySecondary.color.setHex(0x06b6d4);
      this.materials.sceneryGlow.color.setHex(0x34d399);
      this.materials.sceneryRock.color.setHex(0x334155);
      this.materials.neonSignGlowMat.color.setHex(0x06b6d4);
      this.materials.glowPillarMat.color.setHex(0x06b6d4);
    } else if (b.id === 'solar_dunes') {
      this.materials.sceneryPrimary.color.setHex(0xd97706);
      this.materials.scenerySecondary.color.setHex(0xf59e0b);
      this.materials.sceneryGlow.color.setHex(0xfef08a);
      this.materials.sceneryRock.color.setHex(0x78350f);
      this.materials.neonSignGlowMat.color.setHex(0xfbbf24);
      this.materials.glowPillarMat.color.setHex(0xfbbf24);
    } else if (b.id === 'glacial_peaks') {
      this.materials.sceneryPrimary.color.setHex(0x38bdf8);
      this.materials.scenerySecondary.color.setHex(0xa5f3fc);
      this.materials.sceneryGlow.color.setHex(0xe0f2fe);
      this.materials.sceneryRock.color.setHex(0x1e293b);
      this.materials.neonSignGlowMat.color.setHex(0xa5f3fc);
      this.materials.glowPillarMat.color.setHex(0x38bdf8);
    } else {
      // Cyber Volcano
      this.materials.sceneryPrimary.color.setHex(0x7f1d1d);
      this.materials.scenerySecondary.color.setHex(0xf43f5e);
      this.materials.sceneryGlow.color.setHex(0xfacc15);
      this.materials.sceneryRock.color.setHex(0x18000a);
      this.materials.neonSignGlowMat.color.setHex(0xf43f5e);
      this.materials.glowPillarMat.color.setHex(0xfacc15);
    }

    this.initAtmosphericParticles(this.lastPlayerZ || 0);
  }

  initAtmosphericParticles(playerZ = this.lastPlayerZ || 0) {
    const biome = BIOMES[this.currentBiomeIndex] || BIOMES[0];
    const isTouch = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    let count = biome.particleCount || 200;
    if (isTouch) count = Math.min(count, 100);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    const baseColor = new THREE.Color(biome.particleColor || 0x06b6d4);
    const railX = CONFIG.LANE_WIDTH * 1.5 + 0.5;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const brightness = 0.7 + Math.random() * 0.3;
      colors[idx] = baseColor.r * brightness;
      colors[idx + 1] = baseColor.g * brightness;
      colors[idx + 2] = baseColor.b * brightness;

      positions[idx] = -railX - 3 + Math.random() * (railX * 2 + 6);
      positions[idx + 1] = 0.6 + Math.random() * (CONFIG.CEILING_HEIGHT - 1.2);
      positions[idx + 2] = (playerZ - 8) + Math.random() * (CONFIG.CHUNK_LENGTH * 3 + 8);

      phases[i] = Math.random() * Math.PI * 2;
      velocities[idx] = 0;
      velocities[idx + 1] = (biome.particleRise !== undefined ? biome.particleRise : 0.8) * (0.5 + Math.random());
      velocities[idx + 2] = 0;
    }

    this.ambientGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.ambientGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
    }
    this.ambientParticles = new THREE.Points(this.ambientGeo, this.ambientMat);
    this.scene.add(this.ambientParticles);

    this.ambientVelocities = velocities;
    this.ambientPhases = phases;
    this.ambientCount = count;
  }

  updateAtmosphericParticles(playerZ, dt) {
    if (!this.ambientParticles || !this.ambientGeo || !this.ambientVelocities) return;
    const biome = BIOMES[this.currentBiomeIndex] || BIOMES[0];
    const time = performance.now() * 0.001;
    const posAttr = this.ambientGeo.getAttribute('position');
    if (!posAttr) return;
    const positions = posAttr.array;
    const railX = CONFIG.LANE_WIDTH * 1.5 + 0.5;
    const count = this.ambientCount;
    const particleWind = biome.particleWind !== undefined ? biome.particleWind : 0.5;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const phase = this.ambientPhases[i];

      positions[idx] += (particleWind * 0.6 + Math.sin(time * 0.8 + phase) * 0.5) * dt;
      positions[idx + 1] += (this.ambientVelocities[idx + 1] + Math.sin(time * 1.3 + phase) * 0.05) * dt;

      // Wrap по Z
      if (positions[idx + 2] > playerZ + CONFIG.CHUNK_LENGTH * 3) {
        positions[idx + 2] = playerZ - 8;
        positions[idx] = -railX - 3 + Math.random() * (railX * 2 + 6);
        positions[idx + 1] = 0.6 + Math.random() * (CONFIG.CEILING_HEIGHT - 1.2);
      } else if (positions[idx + 2] < playerZ - 8) {
        positions[idx + 2] = playerZ + CONFIG.CHUNK_LENGTH * 3;
        positions[idx] = -railX - 3 + Math.random() * (railX * 2 + 6);
        positions[idx + 1] = 0.6 + Math.random() * (CONFIG.CEILING_HEIGHT - 1.2);
      }

      // Wrap по Y
      if (positions[idx + 1] > CONFIG.CEILING_HEIGHT - 0.2) {
        positions[idx + 1] = 0.6;
      } else if (positions[idx + 1] < 0.4) {
        positions[idx + 1] = CONFIG.CEILING_HEIGHT - 0.6;
      }

      // Wrap по X
      if (positions[idx] < -railX - 4) {
        positions[idx] = railX + 4;
      } else if (positions[idx] > railX + 4) {
        positions[idx] = -railX - 4;
      }
    }

    posAttr.needsUpdate = true;
  }

  createChunk(chunkZIndex, level = 1) {
    const chunkGroup = new THREE.Group();
    const zPos = chunkZIndex * CONFIG.CHUNK_LENGTH;
    const chunkCenterZ = zPos + CONFIG.CHUNK_LENGTH * 0.5;

    // 1. Floor Platform & Glowing Runway Stripes
    const floor = new THREE.Mesh(this.geos.chunkPlatform, this.materials.floor);
    floor.position.set(0, -0.25, chunkCenterZ);
    chunkGroup.add(floor);

    // Two glowing neon lane dividers on floor
    const laneDivOffset = CONFIG.LANE_WIDTH * 0.5;
    const stripeFloorL = new THREE.Mesh(this.geos.laneDivider, this.materials.laneStripe);
    stripeFloorL.position.set(-laneDivOffset, 0.01, chunkCenterZ);
    const stripeFloorR = new THREE.Mesh(this.geos.laneDivider, this.materials.laneStripe);
    stripeFloorR.position.set(laneDivOffset, 0.01, chunkCenterZ);
    chunkGroup.add(stripeFloorL);
    chunkGroup.add(stripeFloorR);

    // 2. Ceiling Platform (без светящихся полос — они выглядели как лампы и сбивали с толку)
    const ceiling = new THREE.Mesh(this.geos.chunkPlatform, this.materials.ceiling);
    ceiling.position.set(0, CONFIG.CEILING_HEIGHT + 0.25, chunkCenterZ);
    chunkGroup.add(ceiling);

    // 3. Side Guard Rails with Neon Insets
    const railX = CONFIG.LANE_WIDTH * 1.5 + 0.5;

    // Floor rails
    const railFL = new THREE.Mesh(this.geos.railBeam, this.materials.archStructure);
    railFL.position.set(-railX, 0.2, chunkCenterZ);
    const glowFL = new THREE.Mesh(this.geos.railGlow, this.materials.laneStripe);
    glowFL.position.set(-railX + 0.1, 0.2, chunkCenterZ);

    const railFR = new THREE.Mesh(this.geos.railBeam, this.materials.archStructure);
    railFR.position.set(railX, 0.2, chunkCenterZ);
    const glowFR = new THREE.Mesh(this.geos.railGlow, this.materials.laneStripe);
    glowFR.position.set(railX - 0.1, 0.2, chunkCenterZ);

    chunkGroup.add(railFL); chunkGroup.add(glowFL);
    chunkGroup.add(railFR); chunkGroup.add(glowFR);

    // Ceiling rails
    const railCL = new THREE.Mesh(this.geos.railBeam, this.materials.archStructure);
    railCL.position.set(-railX, CONFIG.CEILING_HEIGHT - 0.2, chunkCenterZ);
    const railCR = new THREE.Mesh(this.geos.railBeam, this.materials.archStructure);
    railCR.position.set(railX, CONFIG.CEILING_HEIGHT - 0.2, chunkCenterZ);
    chunkGroup.add(railCL); chunkGroup.add(railCR);

    // 4. Structural Sci-Fi Support Arches (at chunk start)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, zPos);

    const pillarL = new THREE.Mesh(this.geos.archPillar, this.materials.archStructure);
    pillarL.position.set(-railX, (CONFIG.CEILING_HEIGHT + 0.5) * 0.5 - 0.25, 0);
    const pillarR = new THREE.Mesh(this.geos.archPillar, this.materials.archStructure);
    pillarR.position.set(railX, (CONFIG.CEILING_HEIGHT + 0.5) * 0.5 - 0.25, 0);

    const archBeamTop = new THREE.Mesh(this.geos.archBeam, this.materials.archStructure);
    archBeamTop.position.set(0, CONFIG.CEILING_HEIGHT + 0.25, 0);

    const archNeonSign = new THREE.Mesh(this.geos.archSign, this.materials.archNeon);
    archNeonSign.position.set(0, CONFIG.CEILING_HEIGHT - 0.1, 0.25);

    archGroup.add(pillarL);
    archGroup.add(pillarR);
    archGroup.add(archBeamTop);
    archGroup.add(archNeonSign);
    chunkGroup.add(archGroup);

    // 5. Procedural Biome-Rich Scenery Elements Outside the Track
    this.populateScenery(chunkGroup, zPos);

    // 6. Populate Gameplay Obstacles & Pickups
    if (chunkZIndex >= 2) {
      this.populateChunkContent(chunkGroup, zPos, level);
    }

    this.scene.add(chunkGroup);
    return { group: chunkGroup, zIndex: chunkZIndex };
  }

  populateScenery(chunkGroup, zPos) {
    const currentBiome = BIOMES[this.currentBiomeIndex] || BIOMES[0];
    const railX = CONFIG.LANE_WIDTH * 1.5 + 1.2;

    for (let i = 0; i < 4; i++) {
      const sideZ = zPos + (i + 0.5) * (CONFIG.CHUNK_LENGTH / 4);

      if (currentBiome.id === 'neon_meadows') {
        // Left: Cyber-tree with crystal foliage
        const treeL = new THREE.Group();
        const trunk = new THREE.Mesh(this.geos.treeTrunk, this.materials.archStructure);
        trunk.position.y = 0.9;
        const foliage = new THREE.Mesh(this.geos.treeCone, this.materials.sceneryPrimary);
        foliage.position.y = 2.8;
        const beacon = new THREE.Mesh(this.geos.treeCrystal, this.materials.sceneryGlow);
        beacon.position.y = 4.4;
        beacon.scale.set(0.35, 0.35, 0.35);

        treeL.add(trunk); treeL.add(foliage); treeL.add(beacon);
        treeL.position.set(-railX - 1.5 - Math.random() * 2.5, 0, sideZ);
        chunkGroup.add(treeL);

        // Right: Angular crystal rock cluster
        const rock = new THREE.Mesh(this.geos.sceneryRock, this.materials.sceneryRock);
        const s = 0.8 + Math.random() * 0.7;
        rock.scale.set(s, s * 1.3, s);
        rock.position.set(railX + 1.5 + Math.random() * 2.5, 0.6 * s, sideZ);
        chunkGroup.add(rock);

        // Extra: small glowing bushes near the track
        for (let b = 0; b < 3; b++) {
          const bush = new THREE.Mesh(this.geos.bush, this.materials.sceneryBush);
          const bushSide = b % 2 === 0 ? -1 : 1;
          bush.position.set(bushSide * (railX + 0.5 + Math.random() * 1.5), 0.3, sideZ + (b - 1) * 1.2);
          bush.scale.setScalar(0.6 + Math.random() * 0.5);
          chunkGroup.add(bush);
        }

        // Variational bushes
        const extraBushes = 1 + Math.floor(Math.random() * 2);
        for (let eb = 0; eb < extraBushes; eb++) {
          const bush = new THREE.Mesh(this.geos.bush, this.materials.sceneryBush);
          const bushSide = Math.random() < 0.5 ? -1 : 1;
          bush.position.set(bushSide * (railX + 1.2 + Math.random() * 2.0), 0.25, sideZ + (Math.random() - 0.5) * 3);
          bush.scale.setScalar(0.4 + Math.random() * 0.5);
          bush.rotation.y = Math.random() * Math.PI * 2;
          chunkGroup.add(bush);
        }

      } else if (currentBiome.id === 'solar_dunes') {
        // Left: Floating antigravity solar pyramid
        const pyramid = new THREE.Mesh(this.geos.sceneryPyramid, this.materials.sceneryPrimary);
        pyramid.position.set(-railX - 2.5 - Math.random() * 2, 2.5 + Math.sin(i) * 0.8, sideZ);
        pyramid.rotation.y = i * 0.8;
        chunkGroup.add(pyramid);

        // Small secondary pyramid near the big one
        const smallPyramid = new THREE.Mesh(this.geos.sceneryPyramid, this.materials.scenerySecondary);
        const pyrScale = 0.4 + Math.random() * 0.3;
        smallPyramid.scale.setScalar(pyrScale);
        smallPyramid.position.set(-railX - 1.2 - Math.random() * 1.5, 1.2 + Math.sin(i + 1) * 0.4, sideZ + 1.2);
        smallPyramid.rotation.y = Math.random() * Math.PI * 2;
        chunkGroup.add(smallPyramid);

        // Right: Solar capacitor monolith
        const pillar = new THREE.Mesh(this.geos.sceneryPillar, this.materials.scenerySecondary);
        pillar.position.set(railX + 2.0 + Math.random() * 2, 2.1, sideZ);
        chunkGroup.add(pillar);

        // Extra: small sand dunes (flattened rocks)
        for (let d = 0; d < 2; d++) {
          const dune = new THREE.Mesh(this.geos.dune, this.materials.sceneryDune);
          const duneSide = d % 2 === 0 ? -1 : 1;
          dune.position.set(duneSide * (railX + 1.0 + Math.random() * 2), 0.3, sideZ + (d - 0.5) * 2);
          dune.rotation.y = Math.random() * Math.PI;
          chunkGroup.add(dune);
        }

      } else if (currentBiome.id === 'glacial_peaks') {
        // Left & Right: Ice crystal monoliths
        const iceL = new THREE.Mesh(this.geos.treeCone, this.materials.sceneryPrimary);
        iceL.scale.set(1.1, 1.8, 1.1);
        iceL.position.set(-railX - 2.0 - Math.random() * 2, 2.8, sideZ);
        chunkGroup.add(iceL);

        const iceR = new THREE.Mesh(this.geos.sceneryRock, this.materials.scenerySecondary);
        const s = 1.0 + Math.random() * 0.8;
        iceR.scale.set(s, s * 1.6, s);
        iceR.position.set(railX + 2.0 + Math.random() * 2, s * 0.8, sideZ);
        chunkGroup.add(iceR);

        // Extra: small ice spikes on the ground
        for (let sp = 0; sp < 3; sp++) {
          const spike = new THREE.Mesh(this.geos.iceSpike, this.materials.sceneryIceSpike);
          const spikeSide = sp % 2 === 0 ? -1 : 1;
          spike.position.set(spikeSide * (railX + 0.8 + Math.random() * 1.5), 0.5, sideZ + (sp - 1) * 1.5);
          spike.rotation.y = Math.random() * Math.PI;
          chunkGroup.add(spike);
        }

        // Variational ice spikes
        const extraSpikes = 1 + Math.floor(Math.random() * 2);
        for (let esp = 0; esp < extraSpikes; esp++) {
          const spike2 = new THREE.Mesh(this.geos.iceSpike, this.materials.sceneryIceSpike);
          const spikeSide = Math.random() < 0.5 ? -1 : 1;
          const sc = 0.5 + Math.random() * 0.3;
          spike2.scale.set(sc, sc, sc);
          spike2.position.set(spikeSide * (railX + 1.5 + Math.random() * 2.0), 0.5 * sc, sideZ + (Math.random() - 0.5) * 3);
          spike2.rotation.y = Math.random() * Math.PI;
          chunkGroup.add(spike2);
        }

      } else {
        // Cyber Volcano: Obsidian basalt towers & magma vents
        const basalt = new THREE.Mesh(this.geos.sceneryPillar, this.materials.sceneryRock);
        basalt.position.set(-railX - 2.0 - Math.random() * 2, 2.1, sideZ);
        chunkGroup.add(basalt);

        const lavaRock = new THREE.Mesh(this.geos.sceneryRock, this.materials.scenerySecondary);
        lavaRock.position.set(railX + 2.0 + Math.random() * 2, 0.8, sideZ);
        chunkGroup.add(lavaRock);

        // Small lava rock near basalt
        const smallLavaRock = new THREE.Mesh(this.geos.sceneryRock, this.materials.scenerySecondary);
        const lrs = 0.5 + Math.random() * 0.3;
        smallLavaRock.scale.set(lrs, lrs * 1.1, lrs);
        smallLavaRock.position.set(-railX - 1.2 - Math.random() * 1.5, 0.5 * lrs, sideZ + 1.0);
        chunkGroup.add(smallLavaRock);

        // Extra: glowing magma pools
        for (let p = 0; p < 2; p++) {
          const pool = new THREE.Mesh(this.geos.magmaPool, this.materials.sceneryMagmaPool);
          const poolSide = p % 2 === 0 ? -1 : 1;
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(poolSide * (railX + 0.8 + Math.random() * 1.5), 0.05, sideZ + (p - 0.5) * 2);
          chunkGroup.add(pool);
        }
      }
    }

    // Extra ambient decor: neon signs, glow pillars, floating orbs, cables
    this.populateAmbientDecor(chunkGroup, zPos);
  }

  /**
   * Ambient decorative props: neon signs, glowing pillars, floating orbs, cables.
   */
  populateAmbientDecor(chunkGroup, zPos) {
    const railX = CONFIG.LANE_WIDTH * 1.5 + 1.2;

    // Neon signs on the side walls
    for (let i = 0; i < 2; i++) {
      const signZ = zPos + 5 + i * (CONFIG.CHUNK_LENGTH / 2);
      const signGroup = new THREE.Group();
      const sign = new THREE.Mesh(this.geos.neonSign, this.materials.neonSignMat);
      const glow = new THREE.Mesh(this.geos.neonSignGlow, this.materials.neonSignGlowMat);
      signGroup.add(sign);
      signGroup.add(glow);
      signGroup.position.set(railX + 0.3, 2.8, signZ);
      signGroup.rotation.y = -Math.PI / 2;
      signGroup.userData.animate = 'neonSignFlicker';
      signGroup.userData.phase = Math.random() * Math.PI * 2;
      chunkGroup.add(signGroup);
    }

    // Ventilation grilles on the side walls (with glowing slats)
    for (let i = 0; i < 3; i++) {
      const ventZ = zPos + 2 + i * (CONFIG.CHUNK_LENGTH / 3);
      const side = i % 2 === 0 ? -1 : 1;
      const ventGroup = new THREE.Group();
      const grille = new THREE.Mesh(this.geos.ventGrille, this.materials.ventMat);
      const slat1 = new THREE.Mesh(this.geos.ventSlat, this.materials.ventGlowMat);
      slat1.position.set(0, 0.1, 0.05);
      const slat2 = new THREE.Mesh(this.geos.ventSlat, this.materials.ventGlowMat);
      slat2.position.set(0, -0.1, 0.05);
      ventGroup.add(grille);
      ventGroup.add(slat1);
      ventGroup.add(slat2);
      ventGroup.position.set(side * (railX + 0.3), 1.6, ventZ);
      ventGroup.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      chunkGroup.add(ventGroup);
    }

    // Energy cables running along the floor edges
    for (let i = 0; i < 2; i++) {
      const cableZ = zPos + 4 + i * (CONFIG.CHUNK_LENGTH / 2);
      const side = i % 2 === 0 ? -1 : 1;
      const cable = new THREE.Mesh(this.geos.energyCable, this.materials.cableMat);
      cable.scale.set(1, 1, CONFIG.CHUNK_LENGTH / 2);
      cable.position.set(side * (CONFIG.LANE_WIDTH * 1.5 + 0.2), 0.1, cableZ);
      chunkGroup.add(cable);
    }

    // Glowing floor lights along the track
    for (let i = 0; i < 4; i++) {
      const lightZ = zPos + 1 + i * (CONFIG.CHUNK_LENGTH / 4);
      const side = i % 2 === 0 ? -1 : 1;
      const light = new THREE.Mesh(this.geos.floorLight, this.materials.floorLightMat);
      light.position.set(side * (CONFIG.LANE_WIDTH * 1.5 + 0.1), 0.03, lightZ);
      chunkGroup.add(light);
    }

    // Glowing pillars along the track
    for (let i = 0; i < 3; i++) {
      const pillarZ = zPos + 3 + i * (CONFIG.CHUNK_LENGTH / 3);
      const side = i % 2 === 0 ? -1 : 1;
      const pillarGroup = new THREE.Group();
      const base = new THREE.Mesh(this.geos.glowPillarBase, this.materials.glowPillarBaseMat);
      base.position.y = 0.1;
      const shaft = new THREE.Mesh(this.geos.glowPillar, this.materials.glowPillarMat);
      shaft.position.y = 1.35;
      pillarGroup.add(base);
      pillarGroup.add(shaft);
      pillarGroup.position.set(side * (railX + 0.8), 0, pillarZ);
      chunkGroup.add(pillarGroup);
    }

    // Cables connecting side pillars
    for (let i = 0; i < 2; i++) {
      const cableZ = zPos + 10 + i * (CONFIG.CHUNK_LENGTH / 2);
      const cable = new THREE.Mesh(this.geos.cable, this.materials.cableMat);
      cable.scale.set(1, 1, (railX * 2 + 2) / 1);
      cable.position.set(0, 4.5, cableZ);
      chunkGroup.add(cable);
    }
  }

  populateChunkContent(chunkGroup, zStart, level = 1) {
    const laneXs = [CONFIG.LANE_WIDTH, 0, -CONFIG.LANE_WIDTH]; // 0=Left, 1=Center, 2=Right
    const chunkType = Math.random();

    // Плотность препятствий растёт с уровнем (но не выше потолка)
    const densityBonus = Math.min(
      CONFIG.LEVEL_MAX_OBSTACLE_DENSITY,
      (level - 1) * CONFIG.LEVEL_OBSTACLE_DENSITY
    );
    // Вероятность добавить "лишние" препятствия в сегмент
    const extraChance = densityBonus;

    // 25% chance: Massive Floor Energy Wall (Requires Ceiling Gravity Inversion!)
    if (chunkType < 0.25) {
      const zWall = zStart + 24;

      const wallGroup = new THREE.Group();
      wallGroup.position.set(0, 0, zWall);

      const pylonL = new THREE.Mesh(this.geos.laserGeneratorPylon, this.materials.archStructure);
      pylonL.position.set(-CONFIG.LANE_WIDTH * 1.5 - 0.2, 1.4, 0);
      const pylonR = new THREE.Mesh(this.geos.laserGeneratorPylon, this.materials.archStructure);
      pylonR.position.set(CONFIG.LANE_WIDTH * 1.5 + 0.2, 1.4, 0);

      const wall = new THREE.Mesh(this.geos.fullLaserGrid, this.materials.laserWall);
      wall.position.set(0, 1.35, 0);

      const scanLine = new THREE.Mesh(this.geos.laserScanLine, this.materials.barrierNeonGlow);
      scanLine.position.set(0, 1.35, 0);
      scanLine.userData.animate = 'laserScan';

      wallGroup.add(pylonL);
      wallGroup.add(pylonR);
      wallGroup.add(wall);
      wallGroup.add(scanLine);
      chunkGroup.add(wallGroup);

      this.obstacles.push({
        mesh: wallGroup,
        type: 'floor_wall',
        hitbox: {
          minX: -CONFIG.LANE_WIDTH * 1.5 - 0.3,
          maxX: CONFIG.LANE_WIDTH * 1.5 + 0.3,
          minY: 0,
          maxY: 2.7,
          minZ: zWall - 0.3,
          maxZ: zWall + 0.3
        }
      });

      // Bonus Grav-Coins on the ceiling over the wall
      for (let c = 0; c < 5; c++) {
        const coinMesh = this.createCoinMesh('grav');
        const coinZ = zWall - 8 + c * 4;
        const coinY = CONFIG.CEILING_HEIGHT - 0.9;
        coinMesh.position.set(0, coinY, coinZ);
        chunkGroup.add(coinMesh);
        this.coins.push({ mesh: coinMesh, active: true, type: 'grav', isGravBonus: true, x: 0, y: coinY, z: coinZ });
      }
      return;
    }

    // Standard segments with mixed Floor & Ceiling obstacles and rewards
    for (let segment = 1; segment <= 3; segment++) {
      const z = zStart + segment * 13 + Math.random() * 2;
      const freeFloorLane = Math.floor(Math.random() * 3);
      const freeCeilLane = Math.floor(Math.random() * 3);

      // Floor obstacles & coins
      for (let lane = 0; lane < 3; lane++) {
        const x = laneXs[lane];

        if (lane !== freeFloorLane) {
          const obsType = Math.random();
          if (obsType < 0.35) {
            // Detailed Low Barrier (Jump over)
            const barrierGrp = new THREE.Group();
            barrierGrp.position.set(x, 0, z);

            const pL = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
            pL.position.set(-1.1, 0.4, 0);
            const pR = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
            pR.position.set(1.1, 0.4, 0);
            const bar = new THREE.Mesh(this.geos.barrierBar, this.materials.barrierHazard);
            bar.position.set(0, 0.4, 0);

            const neonTop = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
            neonTop.position.set(0, 0.62, 0);
            neonTop.userData.animate = 'barrierNeon';
            neonTop.userData.phase = Math.random() * Math.PI * 2;

            const neonBottom = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
            neonBottom.position.set(0, 0.18, 0);
            neonBottom.userData.animate = 'barrierNeon';
            neonBottom.userData.phase = Math.random() * Math.PI * 2;

            barrierGrp.add(pL); barrierGrp.add(pR); barrierGrp.add(bar);
            barrierGrp.add(neonTop); barrierGrp.add(neonBottom);
            chunkGroup.add(barrierGrp);

            this.obstacles.push({
              mesh: barrierGrp,
              type: 'jump',
              hitbox: { minX: x - 1.1, maxX: x + 1.1, minY: 0, maxY: 0.8, minZ: z - 0.3, maxZ: z + 0.3 }
            });
          } else if (obsType < 0.65) {
            // High Laser Barrier (Slide under)
            const barrierGrp = new THREE.Group();
            barrierGrp.position.set(x, 0, z);

            const pL = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
            pL.scale.set(1, 2.8, 1);
            pL.position.set(-1.1, 1.4, 0);
            const pR = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
            pR.scale.set(1, 2.8, 1);
            pR.position.set(1.1, 1.4, 0);

            const bar = new THREE.Mesh(this.geos.highBarrierBar, this.materials.barrierHazard);
            bar.position.set(0, 2.0, 0);

            const neonEdge = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
            neonEdge.position.set(0, 1.8, 0);
            neonEdge.userData.animate = 'barrierNeon';
            neonEdge.userData.phase = Math.random() * Math.PI * 2;

            barrierGrp.add(pL); barrierGrp.add(pR); barrierGrp.add(bar);
            barrierGrp.add(neonEdge);
            chunkGroup.add(barrierGrp);

            this.obstacles.push({
              mesh: barrierGrp,
              type: 'slide',
              hitbox: { minX: x - 1.1, maxX: x + 1.1, minY: 1.1, maxY: 2.9, minZ: z - 0.3, maxZ: z + 0.3 }
            });
          } else if (obsType < 0.88) {
            // Metallic Spike Cluster with Glowing Tips
            const spikeGrp = new THREE.Group();
            spikeGrp.position.set(x, 0, z);

            for (let s = -0.5; s <= 0.5; s += 0.5) {
              const base = new THREE.Mesh(this.geos.spikeBase, this.materials.spike);
              base.position.set(s, 0.15, 0);
              const tip = new THREE.Mesh(this.geos.spikeCone, this.materials.spikeTip);
              tip.position.set(s, 0.55, 0);
              spikeGrp.add(base);
              spikeGrp.add(tip);
            }
            chunkGroup.add(spikeGrp);

            this.obstacles.push({
              mesh: spikeGrp,
              type: 'spike',
              hitbox: { minX: x - 0.9, maxX: x + 0.9, minY: 0, maxY: 1.1, minZ: z - 0.3, maxZ: z + 0.3 }
            });
          } else {
            // Hovering Enemy Drone (Slide under or dodge lane)
            const droneMesh = this.createDroneMesh();
            const startY = 2.05;
            const timeOffset = Math.random() * Math.PI * 2;
            droneMesh.position.set(x, startY, z);
            chunkGroup.add(droneMesh);

            this.obstacles.push({
              mesh: droneMesh,
              type: 'drone',
              startY,
              timeOffset,
              hitbox: {
                minX: x - 0.8,
                maxX: x + 0.8,
                minY: startY - 0.5,
                maxY: startY + 0.5,
                minZ: z - 0.4,
                maxZ: z + 0.4
              }
            });
          }
        } else {
          // Free floor lane: Coins or Powerup
          if (Math.random() < 0.12) {
            const types = ['magnet', 'shield', 'multiplier', 'slowmo', 'ghost', 'overdrive'];
            const pType = types[Math.floor(Math.random() * types.length)];
            const pMesh = new THREE.Mesh(this.geos.powerup, this.materials.powerups[pType]);
            pMesh.position.set(x, 1.2, z);
            const pGlow = new THREE.Mesh(this.geos.powerupGlowDisc, this.materials.powerupGlowMat);
            pGlow.position.y = -0.5;
            pGlow.userData.animate = 'powerupGlow';
            pMesh.add(pGlow);
            chunkGroup.add(pMesh);
            this.powerups.push({ mesh: pMesh, type: pType, active: true, z, isCeiling: false });
          } else {
            for (let c = 0; c < 3; c++) {
              const type = this.rollFloorCoinType();
              const coinMesh = this.createCoinMesh(type);
              const coinZ = z - 1.5 + c * 1.5;
              const coinY = 0.8 + Math.sin((c / 2) * Math.PI) * 0.7;
              coinMesh.position.set(x, coinY, coinZ);
              chunkGroup.add(coinMesh);
              this.coins.push({ mesh: coinMesh, active: true, type, isGravBonus: false, x, y: coinY, z: coinZ });
            }
          }
        }
      }

      // Ceiling obstacles & coins
      for (let lane = 0; lane < 3; lane++) {
        const x = laneXs[lane];

        if (lane !== freeCeilLane) {
          if (Math.random() < 0.45) {
            const isHangingSpike = Math.random() < 0.5;
            if (isHangingSpike) {
              const spikeGrp = new THREE.Group();
              spikeGrp.position.set(x, 0, z);

              for (let s = -0.4; s <= 0.4; s += 0.4) {
                const tip = new THREE.Mesh(this.geos.hangingCone, this.materials.spikeTip);
                tip.position.set(s, CONFIG.CEILING_HEIGHT - 0.55, 0);
                spikeGrp.add(tip);
              }
              chunkGroup.add(spikeGrp);
              this.obstacles.push({
                mesh: spikeGrp,
                type: 'ceiling_spike',
                hitbox: { minX: x - 0.9, maxX: x + 0.9, minY: CONFIG.CEILING_HEIGHT - 1.1, maxY: CONFIG.CEILING_HEIGHT, minZ: z - 0.3, maxZ: z + 0.3 }
              });
            } else {
              // Ceiling Low Barrier (hangs down from ceiling)
              const barrierGrp = new THREE.Group();
              barrierGrp.position.set(x, 0, z);

              const bar = new THREE.Mesh(this.geos.barrierBar, this.materials.barrierHazard);
              bar.position.set(0, CONFIG.CEILING_HEIGHT - 0.4, 0);
              barrierGrp.add(bar);
              chunkGroup.add(barrierGrp);

              this.obstacles.push({
                mesh: barrierGrp,
                type: 'ceiling_jump',
                hitbox: { minX: x - 1.1, maxX: x + 1.1, minY: CONFIG.CEILING_HEIGHT - 0.8, maxY: CONFIG.CEILING_HEIGHT, minZ: z - 0.3, maxZ: z + 0.3 }
              });
            }
          }
        } else {
          // Free Ceiling Lane: Purple Grav-Coins
          for (let c = 0; c < 3; c++) {
            const type = (c === 1 && Math.random() < 0.1) ? 'diamond' : 'grav';
            const coinMesh = this.createCoinMesh(type);
            const coinZ = z - 1.5 + c * 1.5;
            const coinY = CONFIG.CEILING_HEIGHT - 0.8 - Math.sin((c / 2) * Math.PI) * 0.6;
            coinMesh.position.set(x, coinY, coinZ);
            chunkGroup.add(coinMesh);
            this.coins.push({ mesh: coinMesh, active: true, type, isGravBonus: true, x, y: coinY, z: coinZ });
          }
        }
      }
    }

    // Дополнительные препятствия на высоких уровнях (усложнение)
    if (extraChance > 0 && Math.random() < extraChance) {
      const extraZ = zStart + 8 + Math.random() * (CONFIG.CHUNK_LENGTH - 20);
      const extraLane = Math.floor(Math.random() * 3);
      const x = laneXs[extraLane];
      const roll = Math.random();
      if (roll < 0.3) {
        // Дополнительный барьер (прыжок)
        const barrierGrp = new THREE.Group();
        barrierGrp.position.set(x, 0, extraZ);
        const pL = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
        pL.position.set(-1.1, 0.4, 0);
        const pR = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
        pR.position.set(1.1, 0.4, 0);
        const bar = new THREE.Mesh(this.geos.barrierBar, this.materials.barrierHazard);
        bar.position.set(0, 0.4, 0);

        const neonTop = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
        neonTop.position.set(0, 0.62, 0);
        neonTop.userData.animate = 'barrierNeon';
        neonTop.userData.phase = Math.random() * Math.PI * 2;

        const neonBottom = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
        neonBottom.position.set(0, 0.18, 0);
        neonBottom.userData.animate = 'barrierNeon';
        neonBottom.userData.phase = Math.random() * Math.PI * 2;

        barrierGrp.add(pL); barrierGrp.add(pR); barrierGrp.add(bar);
        barrierGrp.add(neonTop); barrierGrp.add(neonBottom);
        chunkGroup.add(barrierGrp);
        this.obstacles.push({
          mesh: barrierGrp,
          type: 'jump',
          hitbox: { minX: x - 1.1, maxX: x + 1.1, minY: 0, maxY: 0.8, minZ: extraZ - 0.3, maxZ: extraZ + 0.3 }
        });
      } else if (roll < 0.6) {
        // Дополнительные шипы
        const spikeGrp = new THREE.Group();
        spikeGrp.position.set(x, 0, extraZ);
        for (let s = -0.5; s <= 0.5; s += 0.5) {
          const base = new THREE.Mesh(this.geos.spikeBase, this.materials.spike);
          base.position.set(s, 0.15, 0);
          const tip = new THREE.Mesh(this.geos.spikeCone, this.materials.spikeTip);
          tip.position.set(s, 0.55, 0);
          spikeGrp.add(base);
          spikeGrp.add(tip);
        }
        chunkGroup.add(spikeGrp);
        this.obstacles.push({
          mesh: spikeGrp,
          type: 'spike',
          hitbox: { minX: x - 0.9, maxX: x + 0.9, minY: 0, maxY: 1.1, minZ: extraZ - 0.3, maxZ: extraZ + 0.3 }
        });
      } else if (roll < 0.85) {
        // Дополнительный высокий лазер (подкат)
        const barrierGrp = new THREE.Group();
        barrierGrp.position.set(x, 0, extraZ);
        const pL = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
        pL.scale.set(1, 2.8, 1);
        pL.position.set(-1.1, 1.4, 0);
        const pR = new THREE.Mesh(this.geos.barrierPylon, this.materials.barrierFrame);
        pR.scale.set(1, 2.8, 1);
        pR.position.set(1.1, 1.4, 0);
        const bar = new THREE.Mesh(this.geos.highBarrierBar, this.materials.barrierHazard);
        bar.position.set(0, 2.0, 0);

        const neonEdge = new THREE.Mesh(this.geos.barrierNeonEdge, this.materials.barrierNeonGlow);
        neonEdge.position.set(0, 1.8, 0);
        neonEdge.userData.animate = 'barrierNeon';
        neonEdge.userData.phase = Math.random() * Math.PI * 2;

        barrierGrp.add(pL); barrierGrp.add(pR); barrierGrp.add(bar);
        barrierGrp.add(neonEdge);
        chunkGroup.add(barrierGrp);
        this.obstacles.push({
          mesh: barrierGrp,
          type: 'slide',
          hitbox: { minX: x - 1.1, maxX: x + 1.1, minY: 1.1, maxY: 2.9, minZ: extraZ - 0.3, maxZ: extraZ + 0.3 }
        });
      } else {
        // Дополнительный парящий дрон (подкат или смена лейна)
        const droneMesh = this.createDroneMesh();
        const startY = 2.05;
        const timeOffset = Math.random() * Math.PI * 2;
        droneMesh.position.set(x, startY, extraZ);
        chunkGroup.add(droneMesh);
        this.obstacles.push({
          mesh: droneMesh,
          type: 'drone',
          startY,
          timeOffset,
          hitbox: {
            minX: x - 0.8,
            maxX: x + 0.8,
            minY: startY - 0.5,
            maxY: startY + 0.5,
            minZ: extraZ - 0.4,
            maxZ: extraZ + 0.4
          }
        });
      }
    }
  }

  rollFloorCoinType() {
    const r = Math.random();
    if (r < 0.70) return 'gold';
    if (r < 0.88) return 'emerald';
    if (r < 0.97) return 'diamond';
    return 'ruby';
  }

  createCoinMesh(type = 'gold') {
    const group = new THREE.Group();
    const t = type || 'gold';
    let coreGeo, coreMat, ringMat;
    if (t === 'grav') { coreGeo = this.geos.coinCore; coreMat = this.materials.gravCoin; ringMat = this.materials.gravRing; }
    else if (t === 'emerald') { coreGeo = this.geos.coinCore; coreMat = this.materials.emeraldCoin; ringMat = this.materials.emeraldRing; }
    else if (t === 'diamond') { coreGeo = this.geos.diamondCore; coreMat = this.materials.diamondCoin; ringMat = this.materials.diamondRing; }
    else if (t === 'ruby') { coreGeo = this.geos.rubyCore; coreMat = this.materials.rubyCoin; ringMat = this.materials.rubyRing; }
    else { coreGeo = this.geos.coinCore; coreMat = this.materials.coin; ringMat = this.materials.coinRing; }
    const core = new THREE.Mesh(coreGeo, coreMat);
    const rim = new THREE.Mesh(this.geos.coinRim, ringMat);
    const glow = new THREE.Mesh(this.geos.coinGlowDisc, this.materials.coinGlowMat);
    glow.position.y = -0.1;
    glow.userData.animate = 'coinGlow';
    glow.userData.colorType = t;
    group.add(core);
    group.add(rim);
    group.add(glow);
    return group;
  }

  /**
   * Hovering enemy drone — сборка из общих геометрий/материалов (без аллокаций).
   * Корпус-октаэдр, энергетическое кольцо, сенсорный глаз, внутреннее кольцо и реактивное сопло.
   */
  createDroneMesh() {
    const group = new THREE.Group();

    // 0: Основной октаэдрический корпус
    const body = new THREE.Mesh(this.geos.droneOcta, this.materials.droneBody);

    // 1: Внешнее энергетическое кольцо
    const ring = new THREE.Mesh(this.geos.droneRing, this.materials.droneEye);
    ring.rotation.x = Math.PI / 2;

    // 2: Сенсорный глаз (смотрит на игрока: -Z)
    const eye = new THREE.Mesh(this.geos.droneEye, this.materials.droneEye);
    eye.position.set(0, 0, -0.35);

    // 3: Внутреннее контр-вращающееся кольцо
    const innerRing = new THREE.Mesh(this.geos.droneInnerRing, this.materials.droneEye);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.userData.animate = 'droneInnerRing';

    // 4: Реактивное сопло снизу
    const thruster = new THREE.Mesh(this.geos.droneThruster, this.materials.droneThrusterMat);
    thruster.position.y = -0.55;
    thruster.userData.animate = 'droneThruster';

    group.add(body);
    group.add(ring);
    group.add(eye);
    group.add(innerRing);
    group.add(thruster);
    return group;
  }

  initTrack() {
    for (const c of this.activeChunks) {
      this.scene.remove(c.group);
    }
    this.activeChunks = [];
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.currentChunkIndex = 0;

    for (let i = 0; i < CONFIG.MAX_ACTIVE_CHUNKS; i++) {
      const chunk = this.createChunk(i);
      this.activeChunks.push(chunk);
      this.currentChunkIndex++;
    }

    this.initAtmosphericParticles(0);
  }

  update(playerZ, level = 1) {
    this.lastPlayerZ = playerZ;
    const now = performance.now();
    const dt = this.lastUpdateT ? Math.min(Math.max((now - this.lastUpdateT) / 1000, 0), 0.1) : 0.016;
    this.lastUpdateT = now;

    if (this.activeChunks.length > 0) {
      const firstChunk = this.activeChunks[0];
      if (playerZ > (firstChunk.zIndex + 1) * CONFIG.CHUNK_LENGTH + 10) {
        this.scene.remove(firstChunk.group);
        this.activeChunks.shift();

        const newChunk = this.createChunk(this.currentChunkIndex, level);
        this.activeChunks.push(newChunk);
        this.currentChunkIndex++;

        this.obstacles = this.obstacles.filter(o => o.hitbox.maxZ >= playerZ - 25);
        this.coins = this.coins.filter(c => c.z >= playerZ - 25);
        this.powerups = this.powerups.filter(p => p.z >= playerZ - 25);
      }
    }

    // Animate item rotations and glow pulses
    const time = now * 0.003;

    // 1. Coins animation & glow pulse
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.active) {
        c.mesh.rotation.z = time * 2;
        c.mesh.rotation.y = time * 1.5;
        for (let j = 0; j < c.mesh.children.length; j++) {
          const child = c.mesh.children[j];
          if (child.userData && child.userData.animate === 'coinGlow') {
            child.material.opacity = 0.2 + Math.sin(time * 4 + i) * 0.15;
          }
        }
      }
    }

    // 2. Powerups animation & glow pulse
    for (let i = 0; i < this.powerups.length; i++) {
      const p = this.powerups[i];
      if (p.active) {
        p.mesh.rotation.y = time * 2.5;
        p.mesh.rotation.x = time * 1.5;
        for (let j = 0; j < p.mesh.children.length; j++) {
          const child = p.mesh.children[j];
          if (child.userData && child.userData.animate === 'powerupGlow') {
            child.material.opacity = 0.2 + Math.sin(time * 3.5) * 0.15;
          }
        }
      }
    }

    // 3. Obstacles animation (barriers, laser wall, drones)
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (!obs.mesh || !obs.mesh.children) continue;

      if (obs.type === 'floor_wall') {
        this.materials.laserWall.opacity = 0.7 + Math.sin(time * 9) * 0.2;
      }

      for (let j = 0; j < obs.mesh.children.length; j++) {
        const child = obs.mesh.children[j];
        if (!child.userData || !child.userData.animate) continue;

        if (child.userData.animate === 'barrierNeon') {
          const phase = child.userData.phase || 0;
          child.material.opacity = 0.35 + Math.sin(time * 8 + phase) * 0.2;
        } else if (child.userData.animate === 'laserScan') {
          child.material.opacity = 0.5 + Math.sin(time * 9) * 0.3;
        } else if (child.userData.animate === 'droneInnerRing') {
          child.rotation.z = -time * 5;
        } else if (child.userData.animate === 'droneThruster') {
          const to = obs.timeOffset || 0;
          const thrusterScale = 0.8 + Math.sin(time * 6 + to) * 0.3;
          child.scale.setScalar(thrusterScale);
          child.material.opacity = 0.6 + Math.sin(time * 6 + to) * 0.25;
        }
      }
    }

    // 4. Neon signs flicker animation in active chunks
    for (let i = 0; i < this.activeChunks.length; i++) {
      const chunk = this.activeChunks[i];
      if (!chunk.group || !chunk.group.children) continue;
      for (let j = 0; j < chunk.group.children.length; j++) {
        const obj = chunk.group.children[j];
        if (obj.userData && obj.userData.animate === 'neonSignFlicker') {
          const phase = obj.userData.phase || 0;
          const glowMesh = obj.children[1];
          if (glowMesh && glowMesh.material) {
            glowMesh.material.opacity = 0.5 + Math.sin(time * 5 + phase) * 0.3;
          }
        }
      }
    }

    // 5. Atmospheric particles update
    this.updateAtmosphericParticles(playerZ, dt);
  }
}
