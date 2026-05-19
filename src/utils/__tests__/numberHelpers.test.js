import { toNumber, isDefined } from '../numberHelpers';

describe('utils/numberHelpers', () => {
  describe('toNumber()', () => {
    it('renvoie 0 pour null/undefined', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
    });

    it('convertit string → number', () => {
      expect(toNumber('42')).toBe(42);
      expect(toNumber('3.14')).toBe(3.14);
      expect(toNumber('-7')).toBe(-7);
    });

    it('renvoie 0 si NaN', () => {
      expect(toNumber('abc')).toBe(0);
      expect(toNumber({})).toBe(0);
      expect(toNumber([1, 2])).toBe(0);
    });

    it('passe-plat pour les number', () => {
      expect(toNumber(0)).toBe(0);
      expect(toNumber(123)).toBe(123);
      expect(toNumber(-1.5)).toBe(-1.5);
    });

    it('convertit boolean (true→1, false→0)', () => {
      expect(toNumber(true)).toBe(1);
      expect(toNumber(false)).toBe(0);
    });

    it('convertit Date en timestamp', () => {
      const d = new Date('2026-01-01');
      expect(toNumber(d)).toBe(d.getTime());
    });
  });

  describe('isDefined()', () => {
    it('renvoie false pour null et undefined', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });

    it('renvoie true pour 0, false, "" (différent de null)', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(NaN)).toBe(true);
    });

    it('renvoie true pour objets/arrays vides', () => {
      expect(isDefined({})).toBe(true);
      expect(isDefined([])).toBe(true);
    });
  });
});
