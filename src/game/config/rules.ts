/** Gameplay rules shared by the sim, the balance tests and the UI. */

/** Fraction of the total gold spent on a tower returned when it is sold (rounded down). */
export const SELL_REFUND = 0.7;
/** Seconds of countdown after a wave has fully spawned before the next wave starts by itself. */
export const WAVE_GAP = 12;
/** Gold per remaining countdown second when the next wave is called early (rounded up). */
export const EARLY_CALL_BONUS_PER_SECOND = 1;
/** Enemy HP and shield grow by this fraction per level after the first: × (1 + LEVEL_HP_GROWTH × (id − 1)). */
export const LEVEL_HP_GROWTH = 0.12;
/** Seconds a cannonball flies before it lands. */
export const CANNON_FLIGHT_TIME = 0.7;
/** Peak height of the cannonball arc in px: height = 4 × CANNON_ARC_HEIGHT × p × (1 − p). */
export const CANNON_ARC_HEIGHT = 60;
/** A homing projectile hits when it gets this close to its target (px). */
export const PROJECTILE_HIT_DISTANCE = 8;
/** A rocket whose target died looks for a new target within this radius of the target's last position. */
export const ROCKET_RETARGET_RADIUS = 150;
/** Physical damage counts this much against a shield (energy counts fully). */
export const SHIELD_PHYSICAL_EFFICIENCY = 0.5;
/** Stars on a win: lives / maxLives ≥ three → 3, ≥ two → 2, otherwise 1. */
export const STAR_THRESHOLDS = { three: 0.9, two: 0.5 } as const;

/** Tolerance for rounding gold: 180 × 0.7 is 125.99999999999999 in floating point and must refund 126. */
const ROUNDING_EPSILON = 1e-9;

/** Gold returned when a tower that cost `spent` in total is sold. The sim and the HUD both use this. */
export function sellRefund(spent: number): number {
  return Math.floor(spent * SELL_REFUND + ROUNDING_EPSILON);
}

/** Gold for calling the next wave with `secondsLeft` of countdown remaining. The sim and the HUD both use this. */
export function earlyCallBonus(secondsLeft: number): number {
  return Math.max(0, Math.ceil(secondsLeft * EARLY_CALL_BONUS_PER_SECOND - ROUNDING_EPSILON));
}
