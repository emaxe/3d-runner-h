/**
 * CollisionSystem - Evaluates AABB and radial physics interactions between entities.
 */
export class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    const player = this.game.player;
    const levelGen = this.game.levelGen;
    const pHitbox = player.getHitbox();
    const magnetBoostLevel = this.game.storage.data.upgrades.magnet_boost || 0;
    const magnetRadius = 4.5 + magnetBoostLevel * 1.5;

    // 1. Check Obstacle collisions
    for (let i = 0; i < levelGen.obstacles.length; i++) {
      const obs = levelGen.obstacles[i];

      // Dynamic sine hover drone
      if (obs.type === 'drone') {
        obs.timeOffset += dt;
        obs.mesh.position.y = obs.startY + Math.sin(obs.timeOffset * 4) * 0.7;
        obs.hitbox.minY = obs.mesh.position.y - 0.5;
        obs.hitbox.maxY = obs.mesh.position.y + 0.5;
        // Визуальное вращение кольца/корпуса
        if (obs.mesh.children[1]) obs.mesh.children[1].rotation.z += 2.0 * dt;
        if (obs.mesh.children[0]) obs.mesh.children[0].rotation.y += 1.5 * dt;
      }

      if (Math.abs(obs.hitbox.minZ - player.z) > 16) continue;

      const h = obs.hitbox;
      if (
        pHitbox.maxX >= h.minX &&
        pHitbox.minX <= h.maxX &&
        pHitbox.maxY >= h.minY &&
        pHitbox.minY <= h.maxY &&
        pHitbox.maxZ >= h.minZ &&
        pHitbox.minZ <= h.maxZ
      ) {
        this.game.onPlayerHitObstacle(obs);
        break;
      }
    }

    // 2. Check Coin Magnet suction & Collection
    for (let i = 0; i < levelGen.coins.length; i++) {
      const c = levelGen.coins[i];
      if (!c.active) continue;

      if (Math.abs(c.z - player.z) > magnetRadius + 2) continue;

      const cPos = c.mesh.position;
      const dx = cPos.x - player.x;
      const dy = cPos.y - player.y;
      const dz = cPos.z - player.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Magnet attraction
      if (player.magnetTimer > 0 && distSq < magnetRadius * magnetRadius) {
        cPos.x += (player.x - cPos.x) * 12 * dt;
        cPos.y += (player.y - cPos.y) * 12 * dt;
        cPos.z += (player.z - cPos.z) * 12 * dt;
      }

      // Direct Collect Hit (pickup radius ~1.4m)
      if (distSq < 2.0) {
        this.game.collectCoin(c);
      }
    }

    // 3. Powerups Collection
    for (let i = 0; i < levelGen.powerups.length; i++) {
      const p = levelGen.powerups[i];
      if (!p.active) continue;

      if (Math.abs(p.z - player.z) > 10) continue;

      const pPos = p.mesh.position;
      const dx = pPos.x - player.x;
      const dy = pPos.y - player.y;
      const dz = pPos.z - player.z;
      if (dx * dx + dy * dy + dz * dz < 2.2) {
        this.game.collectPowerup(p);
      }
    }
  }
}
