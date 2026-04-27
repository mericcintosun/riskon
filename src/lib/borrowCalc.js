import cfg from '@/config/borrowConfig.json';

export function getTier(score) {
  return cfg.tiers.find(t => score >= t.minScore) ?? cfg.tiers.at(-1);
}

export function maxBorrow(collateralUsd, score) {
  const { collateralFactor } = getTier(score);
  return collateralUsd * collateralFactor;
} 