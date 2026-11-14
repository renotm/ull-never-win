import { describe, expect, it } from 'vitest';
import { LIVRETS_CAP, computeSavings } from './savings';

describe('épargne sur livrets', () => {
  it('1 an : versements + environ une demi-année d’intérêts', () => {
    const s = computeSavings(1, 343.2);
    expect(s.cash).toBe(0);
    expect(s.total.value).toBeCloseTo(343.2 * (1 + 0.017 / 2), 6);
  });

  it('une vie de Loto (80 ans, ~343 €/an) : les intérêts remplissent les livrets vers 60 ans', () => {
    const staked = 343.2 * 80;
    const s = computeSavings(80, staked);
    // 343 × (1,017^n − 1) / 0,017 = 34 950  →  n ≈ 60 ans
    expect(s.fullAfterYears).toBeGreaterThan(57);
    expect(s.fullAfterYears).toBeLessThan(62);
    expect(s.cash).toBeCloseTo(staked - s.depositedLivrets, 6);
    // ≈ 34 950 × 1,017^20 (≈ 49 000 €) + 20 ans × 343 € sur le compte courant (≈ 6 900 €)
    const expected = 34_950 * Math.pow(1.017, 80 - s.fullAfterYears!) + s.cash;
    expect(Math.abs(s.total.value - expected) / expected).toBeLessThan(0.02);
  });

  it('plafonds : plus de versement une fois les livrets pleins, le reste sur le compte courant', () => {
    const s = computeSavings(10, 100_000); // 10 000 €/an
    expect(s.depositedLivrets).toBeLessThanOrEqual(LIVRETS_CAP + 1e-6);
    expect(s.fullAfterYears).not.toBeNull();
    expect(s.cash).toBeCloseTo(100_000 - s.depositedLivrets, 6);
    // Les intérêts font dépasser le plafond.
    expect(s.livrets.value).toBeGreaterThan(LIVRETS_CAP);
  });

  it('âge de l’Univers : montant astronomique calculé en logarithme', () => {
    const s = computeSavings(13.8e9, 1e12);
    expect(s.total.value).toBe(Infinity);
    // ~ 35 000 € × 1,017^13,8 milliards
    expect(s.total.log10).toBeCloseTo(Math.log10(LIVRETS_CAP) + 13.8e9 * Math.log10(1.017), -5);
    expect(s.curve).toBeNull();
  });
});
