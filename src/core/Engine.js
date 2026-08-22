import * as THREE from 'three';
import { BIOMES } from '../config/biomes.js';
import { CONFIG } from '../config/gameConfig.js';

/**
 * Engine - Core Three.js WebGL renderer, scene hierarchy, lighting, and quality profile management.
 */
export class Engine {
  constructor(containerElement) {
    this.container = containerElement || document.getElementById('canvas-container');
    
    // Detect touch device once
    this.isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES[0].skyColor);
    this.scene.fog = new THREE.FogExp2(BIOMES[0].fogColor, BIOMES[0].fogDensity);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      320
    );

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isTouchDevice,
      powerPreference: this.isTouchDevice ? 'default' : 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const initialDpr = this.isTouchDevice
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(window.devicePixelRatio || 1, 2);
    this.maxPixelRatio = initialDpr;
    this.renderer.setPixelRatio(initialDpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // Lighting setup
    this.initLighting();
    this.initStarfield();

    // Biome color transition state (pre-allocated to prevent heap churn in animation loop)
    this.initTransitionState();

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initTransitionState() {
    const defaultBiome = BIOMES[0];
    this.transition = {
      active: false,
      progress: 1.0,
      duration: CONFIG.BIOME_TRANSITION_DURATION || 2.5,
      fromSky: new THREE.Color(defaultBiome.skyColor),
      fromFog: new THREE.Color(defaultBiome.fogColor),
      fromFogDensity: defaultBiome.fogDensity || 0.015,
      fromDirLight: new THREE.Color(defaultBiome.lightColor || 0xffffff),
      fromRimLight: new THREE.Color(defaultBiome.accentColor || 0x38bdf8),
      fromRimIntensity: 0.55,
      fromHemiSky: new THREE.Color(defaultBiome.lightColor || 0x38bdf8),
      fromHemiGround: new THREE.Color(defaultBiome.groundColor || 0x0f172a),
      fromStars: new THREE.Color(defaultBiome.accentColor || 0xffffff),

      targetSky: new THREE.Color(defaultBiome.skyColor),
      targetFog: new THREE.Color(defaultBiome.fogColor),
      targetFogDensity: defaultBiome.fogDensity || 0.015,
      targetDirLight: new THREE.Color(defaultBiome.lightColor || 0xffffff),
      targetRimLight: new THREE.Color(defaultBiome.accentColor || 0x38bdf8),
      targetRimIntensity: 0.55,
      targetHemiSky: new THREE.Color(defaultBiome.lightColor || 0x38bdf8),
      targetHemiGround: new THREE.Color(defaultBiome.groundColor || 0x0f172a),
      targetStars: new THREE.Color(defaultBiome.accentColor || 0xffffff)
    };
  }

  initStarfield() {
    // Distant starfield points for depth
    this.starGroup = new THREE.Group();
    const starGeo = new THREE.BufferGeometry();
    const starCount = this.isTouchDevice ? 150 : 400;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = Math.random() * 60 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      const c = 0.5 + Math.random() * 0.5;
      colors[i * 3] = c;
      colors[i * 3 + 1] = c;
      colors[i * 3 + 2] = c;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight.position.set(15, 30, 20);
    this.scene.add(this.dirLight);

    // Rim/back light for richer silhouette definition
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    this.rimLight.position.set(-10, 15, -20);
    this.scene.add(this.rimLight);

    // Hemisphere light for richer low poly ambient shading
    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.4);
    this.scene.add(this.hemiLight);
  }

  setQuality(preset) {
    this.quality = preset;
    let targetDpr;
    switch (preset) {
      case 'low':
        targetDpr = this.isTouchDevice ? 0.85 : 1.0;
        break;
      case 'med':
        targetDpr = this.isTouchDevice ? 1.0 : 1.5;
        break;
      case 'high':
      default:
        targetDpr = this.isTouchDevice ? 1.5 : 2.0;
        break;
    }
    const deviceDpr = window.devicePixelRatio || 1;
    this.maxPixelRatio = Math.max(0.8, Math.min(deviceDpr, targetDpr));
    this.renderer.setPixelRatio(this.maxPixelRatio);
    this.onWindowResize();
  }

  setAdaptivePixelRatio(ratio) {
    const max = this.maxPixelRatio || (this.isTouchDevice ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2));
    const clamped = Math.max(0.75, Math.min(max, ratio));
    this.renderer.setPixelRatio(clamped);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getCurrentPixelRatio() {
    return this.renderer.getPixelRatio();
  }

  setBiomeVisuals(biome, instant = false) {
    const skyColor = biome.skyColor;
    const fogColor = biome.fogColor;
    const fogDensity = biome.fogDensity !== undefined ? biome.fogDensity : 0.015;
    const dirLightColor = biome.lightColor || 0xffffff;
    const rimLightColor = biome.accentColor || 0x38bdf8;
    const rimIntensity = biome.id === 'cyber_volcano' ? 0.7 : 0.55;
    const hemiSkyColor = biome.lightColor || 0x38bdf8;
    const hemiGroundColor = biome.groundColor || 0x0f172a;
    const starsColor = biome.accentColor || 0xffffff;

    this.transition.targetSky.setHex(skyColor);
    this.transition.targetFog.setHex(fogColor);
    this.transition.targetFogDensity = fogDensity;
    this.transition.targetDirLight.setHex(dirLightColor);
    this.transition.targetRimLight.setHex(rimLightColor);
    this.transition.targetRimIntensity = rimIntensity;
    this.transition.targetHemiSky.setHex(hemiSkyColor);
    this.transition.targetHemiGround.setHex(hemiGroundColor);
    this.transition.targetStars.setHex(starsColor);

    if (instant) {
      this.transition.active = false;
      this.transition.progress = 1.0;
      this.scene.background.copy(this.transition.targetSky);
      this.scene.fog.color.copy(this.transition.targetFog);
      this.scene.fog.density = this.transition.targetFogDensity;
      this.dirLight.color.copy(this.transition.targetDirLight);
      this.rimLight.color.copy(this.transition.targetRimLight);
      this.rimLight.intensity = this.transition.targetRimIntensity;
      this.hemiLight.color.copy(this.transition.targetHemiSky);
      this.hemiLight.groundColor.copy(this.transition.targetHemiGround);
      if (this.stars && this.stars.material && this.stars.material.color) {
        this.stars.material.color.copy(this.transition.targetStars);
      }
    } else {
      this.transition.fromSky.copy(this.scene.background);
      this.transition.fromFog.copy(this.scene.fog.color);
      this.transition.fromFogDensity = this.scene.fog.density;
      this.transition.fromDirLight.copy(this.dirLight.color);
      this.transition.fromRimLight.copy(this.rimLight.color);
      this.transition.fromRimIntensity = this.rimLight.intensity;
      this.transition.fromHemiSky.copy(this.hemiLight.color);
      this.transition.fromHemiGround.copy(this.hemiLight.groundColor);
      if (this.stars && this.stars.material && this.stars.material.color) {
        this.transition.fromStars.copy(this.stars.material.color);
      }
      this.transition.progress = 0.0;
      this.transition.duration = CONFIG.BIOME_TRANSITION_DURATION || 2.5;
      this.transition.active = true;
    }
  }

  update(dt = 0.016) {
    if (!this.transition.active) return;

    this.transition.progress += dt / this.transition.duration;
    if (this.transition.progress >= 1.0) {
      this.transition.progress = 1.0;
      this.transition.active = false;
    }

    const t = this.transition.progress;
    // Smooth ease-in-out S-curve
    const ease = t * t * (3 - 2 * t);

    this.scene.background.lerpColors(this.transition.fromSky, this.transition.targetSky, ease);
    this.scene.fog.color.lerpColors(this.transition.fromFog, this.transition.targetFog, ease);
    this.scene.fog.density = THREE.MathUtils.lerp(this.transition.fromFogDensity, this.transition.targetFogDensity, ease);
    this.dirLight.color.lerpColors(this.transition.fromDirLight, this.transition.targetDirLight, ease);
    this.rimLight.color.lerpColors(this.transition.fromRimLight, this.transition.targetRimLight, ease);
    this.rimLight.intensity = THREE.MathUtils.lerp(this.transition.fromRimIntensity, this.transition.targetRimIntensity, ease);
    this.hemiLight.color.lerpColors(this.transition.fromHemiSky, this.transition.targetHemiSky, ease);
    this.hemiLight.groundColor.lerpColors(this.transition.fromHemiGround, this.transition.targetHemiGround, ease);
    if (this.stars && this.stars.material && this.stars.material.color) {
      this.stars.material.color.lerpColors(this.transition.fromStars, this.transition.targetStars, ease);
    }
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    // Slowly rotate starfield for subtle parallax depth
    if (this.stars) {
      this.stars.rotation.y += 0.0001;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
