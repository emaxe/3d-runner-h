/**
 * Daily mission configurations and helper generators.
 */
export const QUESTS_CONFIG = [
  {
    id: 0,
    title: 'Run 600 Meters',
    target: 600,
    unit: 'm',
    reward: 120,
    getValue: (saveData) => Math.floor(saveData.bestDistance)
  },
  {
    id: 1,
    title: 'Collect 80 Gold Coins',
    target: 80,
    unit: '$',
    reward: 150,
    getValue: (saveData) => saveData.totalCoins
  },
  {
    id: 2,
    title: 'Perform 15 Gravity Flips',
    target: 15,
    unit: 'flips',
    reward: 100,
    getValue: (saveData) => saveData.totalGravityFlips
  },
  {
    id: 3,
    title: 'Ignite Nitro 5 Times',
    target: 5,
    unit: 'boosts',
    reward: 130,
    getValue: (saveData) => saveData.totalNitroUsed || 0
  },
  {
    id: 4,
    title: 'Defeat a Mini-Boss',
    target: 1,
    unit: 'bosses',
    reward: 200,
    getValue: (saveData) => saveData.bossesDefeated || 0
  },
  {
    id: 5,
    title: 'Perform 20 Action Dodges',
    target: 20,
    unit: 'dodges',
    reward: 110,
    getValue: (saveData) => saveData.totalActionDodges || 0
  },
  {
    id: 6,
    title: 'Perform 10 Near Misses',
    target: 10,
    unit: 'dodges',
    reward: 130,
    getValue: (saveData) => saveData.totalNearMisses || 0
  },
  {
    id: 7,
    title: 'Reach 1000 Meters',
    target: 1000,
    unit: 'm',
    reward: 200,
    getValue: (saveData) => Math.floor(saveData.bestDistance)
  }
];
