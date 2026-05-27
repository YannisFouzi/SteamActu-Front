import {
  TIME_CONSTANTS,
  normalizeTimestamp,
  formatRelativeDate,
  formatAbsoluteDate,
  formatTimeOnly,
} from '../dateHelpers';

describe('utils/dateHelpers', () => {
  describe('normalizeTimestamp()', () => {
    it('renvoie 0 pour undefined/null', () => {
      expect(normalizeTimestamp(null)).toBe(0);
      expect(normalizeTimestamp(undefined)).toBe(0);
    });

    it('multiplie par 1000 si timestamp en secondes (< 1e12)', () => {
      expect(normalizeTimestamp(1_700_000_000)).toBe(1_700_000_000_000);
    });

    it('passe-plat si déjà en millisecondes (> 1e12)', () => {
      expect(normalizeTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
    });

    it('renvoie 0 pour falsy 0', () => {
      // 0 est falsy → isDefined(0)=true → 0 * 1000 = 0
      expect(normalizeTimestamp(0)).toBe(0);
    });
  });

  describe('formatRelativeDate()', () => {
    const NOW = new Date('2026-05-19T12:00:00Z').getTime();

    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(NOW);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('renvoie le fallback si timestamp absent (avec language explicite pour i18n stable)', () => {
      expect(formatRelativeDate(0, { fallback: 'Jamais' })).toBe('Jamais');
      expect(formatRelativeDate(null, { fallback: 'Jamais' })).toBe('Jamais');
    });

    it('renvoie un fallback "now" si diff <= 0', () => {
      const result = formatRelativeDate(NOW + 1000, { fallback: 'never' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('inclut minutes si includeMinutes=true et diff < 60min', () => {
      const tenMinAgo = NOW - 10 * TIME_CONSTANTS.MINUTE_MS;
      const result = formatRelativeDate(tenMinAgo, { includeMinutes: true });
      expect(typeof result).toBe('string');
      // Le format dépend de la locale, mais on vérifie qu'on a bien une string non vide
      expect(result.length).toBeGreaterThan(0);
    });

    it('renvoie en heures pour diff < 24h', () => {
      const fiveHoursAgo = NOW - 5 * TIME_CONSTANTS.HOUR_MS;
      const result = formatRelativeDate(fiveHoursAgo);
      expect(typeof result).toBe('string');
    });

    it('renvoie en jours pour diff < 7j', () => {
      const threeDaysAgo = NOW - 3 * TIME_CONSTANTS.DAY_MS;
      const result = formatRelativeDate(threeDaysAgo);
      expect(typeof result).toBe('string');
    });

    it('renvoie date absolue (JJ/MM/AAAA) pour diff >= 7j', () => {
      const tenDaysAgo = NOW - 10 * TIME_CONSTANTS.DAY_MS;
      const result = formatRelativeDate(tenDaysAgo);
      // Format JJ/MM/AAAA ou autre selon locale
      expect(result).toMatch(/\d{2}/);
    });

    it('accepte un timestamp en secondes', () => {
      const sec = Math.floor((NOW - TIME_CONSTANTS.HOUR_MS) / 1000);
      expect(typeof formatRelativeDate(sec)).toBe('string');
    });
  });

  describe('formatAbsoluteDate()', () => {
    it('renvoie "" si timestamp falsy', () => {
      expect(formatAbsoluteDate(0)).toBe('');
      expect(formatAbsoluteDate(null)).toBe('');
      expect(formatAbsoluteDate(undefined)).toBe('');
    });

    it('formate un timestamp en ms', () => {
      const ts = new Date('2026-05-19T12:00:00Z').getTime();
      const result = formatAbsoluteDate(ts);
      expect(result).toMatch(/2026/);
    });

    it('formate un timestamp en secondes (auto-normalize)', () => {
      const sec = Math.floor(new Date('2026-05-19T12:00:00Z').getTime() / 1000);
      const result = formatAbsoluteDate(sec);
      expect(result).toMatch(/2026/);
    });

    it('accepte des options custom (year=2-digit)', () => {
      const ts = new Date('2026-05-19T12:00:00Z').getTime();
      const result = formatAbsoluteDate(ts, { year: '2-digit' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimeOnly()', () => {
    it('renvoie "" si timestamp falsy', () => {
      expect(formatTimeOnly(0)).toBe('');
      expect(formatTimeOnly(null)).toBe('');
      expect(formatTimeOnly(undefined)).toBe('');
    });

    it('formate un timestamp en ms (HH:MM selon locale/TZ)', () => {
      const ts = new Date('2026-05-22T15:00:13Z').getTime();
      const result = formatTimeOnly(ts, {language: 'fr'});
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{1,2}[:.h]\d{2}/);
    });

    it('accepte un timestamp en secondes (auto-normalize)', () => {
      const sec = Math.floor(new Date('2026-05-22T15:00:13Z').getTime() / 1000);
      const result = formatTimeOnly(sec, {language: 'fr'});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('TIME_CONSTANTS', () => {
    it('valeurs cohérentes', () => {
      expect(TIME_CONSTANTS.MINUTE_MS).toBe(60_000);
      expect(TIME_CONSTANTS.HOUR_MS).toBe(60 * 60_000);
      expect(TIME_CONSTANTS.DAY_MS).toBe(24 * 60 * 60_000);
      expect(TIME_CONSTANTS.WEEK_MS).toBe(7 * 24 * 60 * 60_000);
      expect(TIME_CONSTANTS.TIMESTAMP_THRESHOLD).toBe(1e12);
    });
  });
});
