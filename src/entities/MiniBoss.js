import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';

/**
 * MiniBoss - Floating Sentinel Boss with laser barrages, rotating ring, and dynamic hover pattern.
 * v2: снаряды вылетают из пушек и летят к игроку, зарядка + muzzle flash,
 *     каскад взрывов при смерти с падением и затуханием.
 */
export class MiniBoss {
  constructor(scene, particles, audio) {
    this.scene = scene;
    this.particles = particles;
    this.audio = audio;
    this.active = false;
    this.dying = false;
    this.hp = 100;
    this.maxHp = 100;
    this.name = 'SKY SENTINEL';
    this.group = new THREE.Group();
    this.zDistance = 32;
    this.time = 0;
    this.attackTimer = 0;
    this.bossProjectiles = [];
    this.spiralQueue = [];
    this.deathTimer = 0;
    this.deathExplosionInterval = 0;
    this.chargeFlash = 0; // 0..1 — вспышка зарядки перед выстрелом
    this.eyeFlashTimer = 0; // таймер вспышки глаза при уроне

    // Shared projectile geometry and material (zero-allocation combat loop)
    this.projectileGeo = new THREE.DodecahedronGeometry(0.5, 0);
    this.projectileMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    this.buildModel();
    this.scene.add(this.group);
    this.group.visible = false;
  }

  buildModel() {
    // === Core (основной корпус) ===
    const coreGeo = new THREE.OctahedronGeometry(1.6, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      flatShading: true,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.4
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);

    // Внутреннее светящееся ядро (просвечивает сквозь корпус)
    const innerCoreGeo = new THREE.OctahedronGeometry(0.7, 0);
    this.innerCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe600, transparent: true, opacity: 0.9 });
    this.innerCore = new THREE.Mesh(innerCoreGeo, this.innerCoreMat);
    this.innerCore.position.set(0, 0, 0.2);
    this.group.add(this.innerCore);

    // === Rotating Torus Ring (внешнее кольцо) ===
    const ringGeo = new THREE.TorusGeometry(2.4, 0.2, 6, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      flatShading: true,
      emissive: 0x0f172a,
      emissiveIntensity: 0.3
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.ring);

    // Светящееся кольцо-энергия (внутри внешнего)
    const energyRingGeo = new THREE.TorusGeometry(2.0, 0.06, 6, 24);
    this.energyRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
    this.energyRing = new THREE.Mesh(energyRingGeo, this.energyRingMat);
    this.energyRing.rotation.x = Math.PI / 2;
    this.group.add(this.energyRing);

    // === Dual Plasma Cannons (боковые пушки) ===
    const cannonGeo = new THREE.BoxGeometry(0.4, 0.4, 1.2);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      emissive: 0x78350f,
      emissiveIntensity: 0.5
    });
    this.cannonL = new THREE.Mesh(cannonGeo, cannonMat);
    this.cannonL.position.set(-1.8, 0, 0);
    this.cannonR = new THREE.Mesh(cannonGeo, cannonMat);
    this.cannonR.position.set(1.8, 0, 0);
    this.group.add(this.cannonL);
    this.group.add(this.cannonR);

    // Светящиеся наконечники пушек
    const tipGeo = new THREE.ConeGeometry(0.18, 0.3, 6);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });
    this.cannonTipL = new THREE.Mesh(tipGeo, tipMat);
    this.cannonTipL.position.set(-1.8, 0, -0.7);
    this.cannonTipR = new THREE.Mesh(tipGeo, tipMat);
    this.cannonTipR.position.set(1.8, 0, -0.7);
    this.group.add(this.cannonTipL);
    this.group.add(this.cannonTipR);

    // === Side Wing Panels (боковые крылья) ===
    const wingGeo = new THREE.BoxGeometry(0.8, 0.1, 1.6);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
      flatShading: true
    });
    this.wingL = new THREE.Mesh(wingGeo, wingMat);
    this.wingL.position.set(-2.6, 0.2, 0);
    this.wingL.rotation.z = 0.2;
    this.wingR = new THREE.Mesh(wingGeo, wingMat);
    this.wingR.position.set(2.6, 0.2, 0);
    this.wingR.rotation.z = -0.2;
    this.group.add(this.wingL);
    this.group.add(this.wingR);

    // Светящиеся кромки крыльев
    const wingGlowGeo = new THREE.BoxGeometry(0.8, 0.04, 0.1);
    const wingGlowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.wingGlowL = new THREE.Mesh(wingGlowGeo, wingGlowMat);
    this.wingGlowL.position.set(-2.6, 0.2, 0.8);
    this.wingGlowR = new THREE.Mesh(wingGlowGeo, wingGlowMat);
    this.wingGlowR.position.set(2.6, 0.2, 0.8);
    this.group.add(this.wingGlowL);
    this.group.add(this.wingGlowR);

    // === Lower Emitter (нижний излучатель) ===
    const emitterGeo = new THREE.ConeGeometry(0.5, 0.8, 6);
    emitterGeo.rotateX(Math.PI);
    this.emitterMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
    this.emitter = new THREE.Mesh(emitterGeo, this.emitterMat);
    this.emitter.position.set(0, -1.6, 0);
    this.group.add(this.emitter);

    // === Eye Visor (пульсирующее свечение) ===
    const eyeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true });
    this.eye = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.eye.position.set(0, 0, -1.2);
    this.group.add(this.eye);

    // === Muzzle flash lights (невидимые, для вспышки при выстреле) ===
    this.muzzleL = new THREE.PointLight(0xf59e0b, 0, 6);
    this.muzzleL.position.set(-1.8, 0, -0.6);
    this.group.add(this.muzzleL);
    this.muzzleR = new THREE.PointLight(0xf59e0b, 0, 6);
    this.muzzleR.position.set(1.8, 0, -0.6);
    this.group.add(this.muzzleR);
  }

  /**
   * Полный сброс босса при рестарте/выходе в меню. Без этого, если игрок погиб
   * во время боя, босс остаётся активным и мгновенно телепортируется на старт
   * нового забега (Boss Persistence Exploit).
   */
  reset() {
    this.active = false;
    this.dying = false;
    this.hp = this.maxHp;
    this.time = 0;
    this.attackTimer = 0;
    this.deathTimer = 0;
    this.chargeFlash = 0;
    this.eyeFlashTimer = 0;
    this.group.visible = false;
    this.group.scale.set(1, 1, 1);
    this.group.rotation.set(0, 0, 0);

    // Удаляем все снаряды босса со сцены
    for (const p of this.bossProjectiles) {
      this.scene.remove(p.mesh);
    }
    this.bossProjectiles = [];
    this.spiralQueue = [];
  }

  spawn(playerZ, biomeIndex = 0, level = 1) {
    this.active = true;
    this.dying = false;
    this.level = level;
    // HP растёт с уровнем
    this.maxHp = 100 + (level - 1) * CONFIG.LEVEL_BOSS_HP_BONUS;
    this.hp = this.maxHp;
    this.time = 0;
    this.attackTimer = 1.5;
    this.deathTimer = 0;
    this.chargeFlash = 0;
    this.eyeFlashTimer = 0;
    this.group.visible = true;

    const names = ['SKY SENTINEL', 'SOLAR ANNIHILATOR', 'FROST DREADNOUGHT', 'MAGMA BEHEMOTH'];
    this.name = names[biomeIndex % names.length];

    this.group.position.set(0, 2.5, playerZ + this.zDistance);
    this.audio.playSound('boss_alarm');
  }

  takeDamage(amount) {
    if (!this.active || this.dying) return false;
    this.hp -= amount;
    // Вспышка при попадании — частицы на позиции попадания (по центру босса)
    this.particles.spawn(
      this.group.position.x + (Math.random() - 0.5) * 2,
      this.group.position.y + (Math.random() - 0.5) * 2,
      this.group.position.z,
      8,
      0xf59e0b,
      5,
      0.2,
      0.4,
      'spark'
    );
    // Краткая вспышка глаза при уроне
    this.eyeMat.color.setHex(0xffffff);
    this.eyeFlashTimer = 0.08;

    if (this.hp <= 0) {
      this.hp = 0;
      this.defeat();
      return true;
    }
    return false;
  }

  defeat() {
    // Запускаем каскадную анимацию смерти (не выключаем active сразу —
    // Game даст награду, когда active станет false после анимации)
    this.dying = true;
    this.deathTimer = 0;
    this.deathExplosionInterval = 0;
    this.audio.playSound('crash');

    // Первый мощный взрыв в центре
    this.spawnBigExplosion(this.group.position.x, this.group.position.y, this.group.position.z, 0xef4444, 30);

    // Убираем активные снаряды босса
    for (const p of this.bossProjectiles) {
      this.scene.remove(p.mesh);
    }
    this.bossProjectiles = [];
  }

  spawnBigExplosion(x, y, z, color, count) {
    this.particles.spawn(x, y, z, count, color, 8, 0.35, 0.8, 'sphere', 3);
    this.particles.spawn(x, y, z, Math.floor(count * 0.6), 0xffe600, 10, 0.15, 0.5, 'spark', 2);
  }

  updateDeath(dt) {
    this.deathTimer += dt;
    this.deathExplosionInterval -= dt;

    // Каскад взрывов каждые ~0.12с в случайных точках вокруг босса
    if (this.deathExplosionInterval <= 0) {
      this.deathExplosionInterval = 0.12;
      const colors = [0xef4444, 0xf59e0b, 0xffe600, 0xdc2626];
      const col = colors[Math.floor(Math.random() * colors.length)];
      const ox = (Math.random() - 0.5) * 3;
      const oy = (Math.random() - 0.5) * 3;
      const oz = (Math.random() - 0.5) * 2;
      this.spawnBigExplosion(
        this.group.position.x + ox,
        this.group.position.y + oy,
        this.group.position.z + oz,
        col,
        12
      );
    }

    // Падение вниз с вращением
    this.group.position.y -= 6 * dt;
    this.group.rotation.x += 4 * dt;
    this.group.rotation.z += 3 * dt;
    this.group.scale.multiplyScalar(Math.max(0.2, 1 - dt * 1.2));

    // Затухание материалов
    const fade = Math.max(0, 1 - this.deathTimer / 1.6);
    this.core.material.emissiveIntensity = 0.4 * fade;
    this.eyeMat.opacity = fade;
    this.eyeMat.transparent = true;

    // Конец анимации
    if (this.deathTimer >= 1.6) {
      this.active = false;
      this.dying = false;
      this.group.visible = false;
      this.group.scale.set(1, 1, 1);
      this.group.rotation.set(0, 0, 0);
      // Финальный мощный взрыв
      this.spawnBigExplosion(this.group.position.x, this.group.position.y, this.group.position.z, 0xffe600, 40);
    }
  }

  update(dt, player, onPlayerHit) {
    if (!this.active) return;
    this.time += dt;

    // Анимация смерти — отдельная ветка, босс не атакует
    if (this.dying) {
      this.updateDeath(dt);
      return;
    }

    // Follow pacing ahead of player
    const targetZ = player.z + this.zDistance;
    this.group.position.z = targetZ;

    // Sine hover motion across lanes
    const hoverX = Math.sin(this.time * 1.8) * (CONFIG.LANE_WIDTH * 1.1);
    const hoverY = 2.5 + Math.cos(this.time * 2.5) * 0.8;
    this.group.position.x += (hoverX - this.group.position.x) * 6 * dt;
    this.group.position.y += (hoverY - this.group.position.y) * 6 * dt;

    // Mesh Rotations
    this.core.rotation.y += 1.5 * dt;
    this.ring.rotation.z += 2.0 * dt;
    this.ring.rotation.x = Math.sin(this.time) * 0.3;

    // Внутреннее ядро вращается в противофазе
    this.innerCore.rotation.y -= 2.5 * dt;
    this.innerCore.rotation.z += 1.5 * dt;
    // Пульсация внутреннего ядра
    const innerPulse = 0.8 + Math.sin(this.time * 5) * 0.2;
    this.innerCore.scale.setScalar(innerPulse);

    // Энергетическое кольцо вращается и пульсирует
    this.energyRing.rotation.z += 1.2 * dt;
    this.energyRing.rotation.x = Math.PI / 2 + Math.sin(this.time * 2) * 0.2;
    this.energyRingMat.opacity = 0.5 + Math.sin(this.time * 4) * 0.2;

    // Крылья слегка покачиваются
    this.wingL.rotation.z = 0.2 + Math.sin(this.time * 3) * 0.1;
    this.wingR.rotation.z = -0.2 - Math.sin(this.time * 3) * 0.1;

    // Нижний излучатель пульсирует
    this.emitterMat.opacity = 0.5 + Math.sin(this.time * 6) * 0.3;
    this.emitter.scale.setScalar(1 + Math.sin(this.time * 6) * 0.15);

    // Пульсация глаза (свечение) — пропускаем, если активна вспышка урона
    if (this.eyeFlashTimer > 0) {
      this.eyeFlashTimer -= dt;
      if (this.eyeFlashTimer <= 0) this.eyeMat.color.setHex(0xfacc15);
    } else {
      const eyePulse = 0.7 + Math.sin(this.time * 6) * 0.3;
      this.eyeMat.color.setHex(0xfacc15).multiplyScalar(eyePulse);
    }
    this.eye.scale.setScalar(1 + Math.sin(this.time * 8) * 0.1);

    // Auto-fire player blaster when in boss combat
    player.shootCooldown -= dt;
    if (player.shootCooldown <= 0) {
      player.shootBlaster();
      player.shootCooldown = 0.28;
    }

    // Boss Attack Timer (скорость атак растёт с уровнем и фазой HP)
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      const level = this.level || 1;
      const attackSpeedBonus = 1 + (level - 1) * CONFIG.LEVEL_BOSS_ATTACK_BONUS;
      const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
      let phaseMul = 1.0;
      if (hpRatio <= 0.33) {
        phaseMul = 0.70;
      } else if (hpRatio <= 0.66) {
        phaseMul = 0.85;
      }
      const isHeavy = this.fireAttack(player);
      const raw = (CONFIG.BOSS_BASE_ATTACK_INTERVAL * phaseMul) / attackSpeedBonus + (isHeavy ? 0.2 : 0);
      this.attackTimer = Math.max(CONFIG.BOSS_MIN_ATTACK_INTERVAL, raw);
    }

    // Затухание muzzle flash
    this.muzzleL.intensity = Math.max(0, this.muzzleL.intensity - 30 * dt);
    this.muzzleR.intensity = Math.max(0, this.muzzleR.intensity - 30 * dt);

    // Check Player projectiles hitting Boss
    const bossHitbox = {
      minX: this.group.position.x - 2.2,
      maxX: this.group.position.x + 2.2,
      minY: this.group.position.y - 1.8,
      maxY: this.group.position.y + 1.8,
      minZ: this.group.position.z - 1.5,
      maxZ: this.group.position.z + 1.5
    };

    for (let i = player.projectiles.length - 1; i >= 0; i--) {
      const p = player.projectiles[i];
      const pPos = p.mesh.position;
      if (
        pPos.x >= bossHitbox.minX &&
        pPos.x <= bossHitbox.maxX &&
        pPos.y >= bossHitbox.minY &&
        pPos.y <= bossHitbox.maxY &&
        pPos.z >= bossHitbox.minZ &&
        pPos.z <= bossHitbox.maxZ
      ) {
        this.takeDamage(12);
        this.scene.remove(p.mesh);
        player.projectiles.splice(i, 1);
      }
    }

    // Check Boss Projectiles hitting Player
    const pHitbox = player.getHitbox();
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const bp = this.bossProjectiles[i];
      // Снаряд летит по своему вектору направления (из пушки к игроку)
      bp.mesh.position.x += bp.vx * dt;
      bp.mesh.position.y += bp.vy * dt;
      bp.mesh.position.z += bp.vz * dt;
      bp.mesh.rotation.y += 5 * dt;
      bp.life -= dt;

      const pos = bp.mesh.position;
      if (
        pos.z <= pHitbox.maxZ &&
        pos.z >= pHitbox.minZ &&
        pos.x >= pHitbox.minX &&
        pos.x <= pHitbox.maxX &&
        pos.y >= pHitbox.minY &&
        pos.y <= pHitbox.maxY
      ) {
        this.scene.remove(bp.mesh);
        this.bossProjectiles.splice(i, 1);
        onPlayerHit();
      } else if (pos.z < player.z - 10 || bp.life <= 0) {
        this.scene.remove(bp.mesh);
        this.bossProjectiles.splice(i, 1);
      }
    }
  }

  choosePattern() {
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    const level = Math.min(4, Math.max(1, this.level || 1));

    let pool = [];
    if (level === 1) {
      if (hpRatio > 0.66) {
        pool = [
          { id: 'single', weight: 0.80 },
          { id: 'spread', weight: 0.20 }
        ];
      } else if (hpRatio > 0.33) {
        pool = [
          { id: 'single', weight: 0.60 },
          { id: 'spread', weight: 0.40 }
        ];
      } else {
        pool = [
          { id: 'single', weight: 0.40 },
          { id: 'spread', weight: 0.60 }
        ];
      }
    } else if (level === 2) {
      if (hpRatio > 0.66) {
        pool = [
          { id: 'single', weight: 0.55 },
          { id: 'spread', weight: 0.35 },
          { id: 'pincer', weight: 0.10 }
        ];
      } else if (hpRatio > 0.33) {
        pool = [
          { id: 'single', weight: 0.25 },
          { id: 'spread', weight: 0.40 },
          { id: 'pincer', weight: 0.35 }
        ];
      } else {
        pool = [
          { id: 'spread', weight: 0.30 },
          { id: 'pincer', weight: 0.40 },
          { id: 'split', weight: 0.30 }
        ];
      }
    } else if (level === 3) {
      if (hpRatio > 0.66) {
        pool = [
          { id: 'single', weight: 0.35 },
          { id: 'spread', weight: 0.35 },
          { id: 'pincer', weight: 0.20 },
          { id: 'split', weight: 0.10 }
        ];
      } else if (hpRatio > 0.33) {
        pool = [
          { id: 'spread', weight: 0.25 },
          { id: 'pincer', weight: 0.40 },
          { id: 'split', weight: 0.35 }
        ];
      } else {
        pool = [
          { id: 'spread', weight: 0.15 },
          { id: 'pincer', weight: 0.40 },
          { id: 'split', weight: 0.45 }
        ];
      }
    } else {
      // Level 4+
      if (hpRatio > 0.66) {
        pool = [
          { id: 'single', weight: 0.10 },
          { id: 'spread', weight: 0.25 },
          { id: 'pincer', weight: 0.35 },
          { id: 'split', weight: 0.30 }
        ];
      } else if (hpRatio > 0.33) {
        pool = [
          { id: 'spread', weight: 0.10 },
          { id: 'pincer', weight: 0.40 },
          { id: 'split', weight: 0.50 }
        ];
      } else {
        pool = [
          { id: 'pincer', weight: 0.30 },
          { id: 'split', weight: 0.70 }
        ];
      }
    }

    const available = pool;
    if (available.length === 0) {
      return 'single';
    }

    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * totalWeight;

    for (const p of available) {
      r -= p.weight;
      if (r <= 0) {
        return p.id;
      }
    }

    return available[available.length - 1].id;
  }

  _getProjSpeed(base) {
    return Math.min(52, base + (this.level - 1) * CONFIG.LEVEL_BOSS_PROJECTILE_SPEED_STEP);
  }

  _computeDir(fromX, fromY, fromZ, toX, toY, toZ, speed) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dz = toZ - fromZ;
    const len = Math.hypot(dx, dy, dz) || 1;
    return {
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      vz: (dz / len) * speed
    };
  }

  _spawnProjectile(sx, sy, sz, vx, vy, vz, life = 2.5, muzzle = null) {
    // Лимит снарядов (защита слабых устройств)
    if (this.bossProjectiles.length >= 20) return null;

    const mesh = new THREE.Mesh(this.projectileGeo, this.projectileMat);
    mesh.position.set(sx, sy, sz);
    this.scene.add(mesh);

    this.bossProjectiles.push({
      mesh,
      vx,
      vy,
      vz,
      life
    });

    // Muzzle flash и частицы
    if (muzzle) {
      muzzle.intensity = 2.5;
    }
    this.particles.spawn(sx, sy, sz, 6, 0xf59e0b, 4, 0.15, 0.25, 'spark', 0);
    this.audio.playSound('laser');

    return mesh;
  }

  _fireSingle(player) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const cannon = side < 0 ? this.cannonL : this.cannonR;
    const muzzle = side < 0 ? this.muzzleL : this.muzzleR;

    const startX = this.group.position.x + cannon.position.x;
    const startY = this.group.position.y + cannon.position.y;
    const startZ = this.group.position.z + cannon.position.z - 0.6;

    const targetX = player.x;
    const targetY = player.y + 0.9;
    const targetZ = player.z;
    const speed = this._getProjSpeed(36);

    const dir = this._computeDir(startX, startY, startZ, targetX, targetY, targetZ, speed);
    this._spawnProjectile(startX, startY, startZ, dir.vx, dir.vy, dir.vz, 2.5, muzzle);
    return false;
  }

  _fireSpread(player) {
    const startX = this.group.position.x;
    const startY = this.group.position.y;
    const startZ = this.group.position.z - 0.6;

    const targetY = player.y + 0.9;
    const targetZ = player.z;
    const speed = this._getProjSpeed(34);
    const lanes = [-CONFIG.LANE_WIDTH, 0, CONFIG.LANE_WIDTH];

    this.muzzleL.intensity = 2.5;
    this.muzzleR.intensity = 2.5;

    for (const laneX of lanes) {
      const dir = this._computeDir(startX, startY, startZ, laneX, targetY, targetZ, speed);
      this._spawnProjectile(startX, startY, startZ, dir.vx, dir.vy, dir.vz, 2.5, null);
    }
    return true;
  }

  _firePincer(player) {
    const sxL = this.group.position.x + this.cannonL.position.x;
    const syL = this.group.position.y + this.cannonL.position.y;
    const szL = this.group.position.z + this.cannonL.position.z - 0.6;

    const sxR = this.group.position.x + this.cannonR.position.x;
    const syR = this.group.position.y + this.cannonR.position.y;
    const szR = this.group.position.z + this.cannonR.position.z - 0.6;

    const targetY = player.y + 0.9;
    const targetZ = player.z;
    const speed = this._getProjSpeed(38);

    const targetLx = player.x + 1.2;
    const targetRx = player.x - 1.2;

    const dirL = this._computeDir(sxL, syL, szL, targetLx, targetY, targetZ, speed);
    this._spawnProjectile(sxL, syL, szL, dirL.vx, dirL.vy, dirL.vz, 2.5, this.muzzleL);

    const dirR = this._computeDir(sxR, syR, szR, targetRx, targetY, targetZ, speed);
    this._spawnProjectile(sxR, syR, szR, dirR.vx, dirR.vy, dirR.vz, 2.5, this.muzzleR);

    return true;
  }

  _fireSplit(player) {
    const sxL = this.group.position.x + this.cannonL.position.x;
    const syL = this.group.position.y + this.cannonL.position.y;
    const szL = this.group.position.z + this.cannonL.position.z - 0.6;

    const sxR = this.group.position.x + this.cannonR.position.x;
    const syR = this.group.position.y + this.cannonR.position.y;
    const szR = this.group.position.z + this.cannonR.position.z - 0.6;

    const speed = this._getProjSpeed(36);
    const targetZ = player.z;
    const targetLowY = 0.9;
    const targetHighY = 4.7;

    const dirLow = this._computeDir(sxL, syL, szL, player.x, targetLowY, targetZ, speed);
    this._spawnProjectile(sxL, syL, szL, dirLow.vx, dirLow.vy, dirLow.vz, 2.5, this.muzzleL);

    const dirHigh = this._computeDir(sxR, syR, szR, player.x, targetHighY, targetZ, speed);
    this._spawnProjectile(sxR, syR, szR, dirHigh.vx, dirHigh.vy, dirHigh.vz, 2.5, this.muzzleR);

    return true;
  }

  fireAttack(player) {
    const pattern = this.choosePattern();
    switch (pattern) {
      case 'spread':
        return this._fireSpread(player);
      case 'pincer':
        return this._firePincer(player);
      case 'split':
        return this._fireSplit(player);
      case 'single':
      default:
        return this._fireSingle(player);
    }
  }
}
