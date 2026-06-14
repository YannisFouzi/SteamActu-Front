import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildFollowGameRef,
  queueLocalFollowMutation,
  clearLocalFollowMutation,
  clearLocalFollowMutationIfCurrent,
  readPendingFollowMutations,
  hasPendingFollowMutation,
  clearPendingFollowMutations,
  applyPendingFollowOverlayToUser,
  applyPendingFollowOverlayToGames,
  applyPendingFollowOverlayToFollowedGames,
  applyPendingFollowOverlayToNewsFeed,
  applyLocalFollowState,
} from '../followStateLocalStore';

const STEAM = '76561197960287930';

describe('services/followStateLocalStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('buildFollowGameRef()', () => {
    it('construit une ref minimale à partir d\'un appId seul', () => {
      const ref = buildFollowGameRef({ appId: '730' });
      expect(ref).toMatchObject({
        appId: '730',
        name: 'Game 730',
      });
      // imageUrl vide si aucune source (pas de hash icon)
      expect(ref.imageUrl).toBe('');
      // header_image a un fallback CDN auto-généré
      expect(ref.header_image).toContain('730');
      expect(typeof ref.followedAt).toBe('string');
    });

    it('priorité imageUrl > logoUrl > header_image > capsule > generated', () => {
      const ref = buildFollowGameRef({
        appId: '730',
        imageUrl: 'i',
        logoUrl: 'l',
      });
      expect(ref.imageUrl).toBe('i');
    });

    it('trim le name', () => {
      const ref = buildFollowGameRef({ appId: '730', name: '  CSGO  ' });
      expect(ref.name).toBe('CSGO');
    });
  });

  describe('queueLocalFollowMutation()', () => {
    it('renvoie null si steamId ou appId manquant', async () => {
      expect(
        await queueLocalFollowMutation({
          steamId: '',
          appId: '730',
          targetIsFollowed: true,
        }),
      ).toBeNull();
      expect(
        await queueLocalFollowMutation({
          steamId: STEAM,
          appId: '',
          targetIsFollowed: true,
        }),
      ).toBeNull();
    });

    it('enregistre une mutation et la rend lisible', async () => {
      const mutation = await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
      });
      expect(mutation).toMatchObject({
        appId: '730',
        targetIsFollowed: true,
        steamId: STEAM,
      });

      const pending = await readPendingFollowMutations(STEAM);
      expect(pending['730']).toBeTruthy();
      expect(pending['730'].gameRef.name).toBe('CSGO');
    });

    it('écrase la mutation précédente pour le même appId', async () => {
      await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: false,
      });
      await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
      });
      const pending = await readPendingFollowMutations(STEAM);
      expect(pending['730'].targetIsFollowed).toBe(true);
    });
  });

  describe('clearLocalFollowMutation()', () => {
    it('retire la mutation', async () => {
      await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
      });
      await clearLocalFollowMutation({ steamId: STEAM, appId: '730' });
      expect(await hasPendingFollowMutation({ steamId: STEAM, appId: '730' })).toBe(
        false,
      );
    });

    it('no-op si pas de mutation existante', async () => {
      await expect(
        clearLocalFollowMutation({ steamId: STEAM, appId: '999' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('clearLocalFollowMutationIfCurrent()', () => {
    it('retire si target + updatedAt correspondent', async () => {
      const m = await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
      });
      const cleared = await clearLocalFollowMutationIfCurrent({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
        updatedAt: m.updatedAt,
      });
      expect(cleared).toBe(true);
      expect(await hasPendingFollowMutation({ steamId: STEAM, appId: '730' })).toBe(
        false,
      );
    });

    it('renvoie false si target diffère (mutation plus récente)', async () => {
      const m = await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
      });
      const cleared = await clearLocalFollowMutationIfCurrent({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: false,
        updatedAt: m.updatedAt,
      });
      expect(cleared).toBe(false);
      // mutation toujours là
      expect(await hasPendingFollowMutation({ steamId: STEAM, appId: '730' })).toBe(
        true,
      );
    });

    it('renvoie true si pas de mutation (idempotence)', async () => {
      const cleared = await clearLocalFollowMutationIfCurrent({
        steamId: STEAM,
        appId: '999',
        targetIsFollowed: true,
      });
      expect(cleared).toBe(true);
    });
  });

  describe('clearPendingFollowMutations()', () => {
    it('vide toutes les mutations du user', async () => {
      await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
      });
      await queueLocalFollowMutation({
        steamId: STEAM,
        appId: '570',
        targetIsFollowed: false,
      });
      await clearPendingFollowMutations(STEAM);
      const pending = await readPendingFollowMutations(STEAM);
      expect(pending).toEqual({});
    });
  });

  describe('applyPendingFollowOverlayToUser()', () => {
    const mut = (overrides) => ({
      appId: '730',
      steamId: STEAM,
      targetIsFollowed: true,
      ...overrides,
    });

    it('ajoute appId si targetIsFollowed=true', () => {
      const user = { followedGames: ['570'] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': mut({ targetIsFollowed: true }),
      });
      expect(result.followedGames.sort()).toEqual(['570', '730']);
    });

    it('retire appId si targetIsFollowed=false', () => {
      const user = { followedGames: ['730', '570'] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': mut({ targetIsFollowed: false }),
      });
      expect(result.followedGames).toEqual(['570']);
    });

    it('renvoie user tel quel si null', () => {
      expect(applyPendingFollowOverlayToUser(null, {})).toBeNull();
    });

    it('ignore les mutations invalides (pas de targetIsFollowed boolean)', () => {
      const user = { followedGames: [] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': { appId: '730', steamId: STEAM }, // targetIsFollowed manquant
      });
      expect(result.followedGames).toEqual([]);
    });

    // mutedGames suit le même overlay (protège l'état muté optimiste au refresh)
    it('suivi silencieux (notifications:false) → ajoute appId à mutedGames', () => {
      const user = { followedGames: ['570'], mutedGames: [] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': mut({ targetIsFollowed: true, notifications: false }),
      });
      expect(result.followedGames.sort()).toEqual(['570', '730']);
      expect(result.mutedGames).toEqual(['730']);
    });

    it('réactivation (notifications:true) → retire appId de mutedGames même si le serveur le disait muté', () => {
      const user = { followedGames: ['730'], mutedGames: ['730'] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': mut({ targetIsFollowed: true, notifications: true }),
      });
      expect(result.mutedGames).toEqual([]);
    });

    it('unfollow → retire appId de followedGames ET mutedGames', () => {
      const user = { followedGames: ['730'], mutedGames: ['730'] };
      const result = applyPendingFollowOverlayToUser(user, {
        '730': mut({ targetIsFollowed: false }),
      });
      expect(result.followedGames).toEqual([]);
      expect(result.mutedGames).toEqual([]);
    });

    it('préserve mutedGames serveur pour les jeux sans mutation en file', () => {
      const user = { followedGames: ['730', '570'], mutedGames: ['570'] };
      const result = applyPendingFollowOverlayToUser(user, {});
      expect(result.mutedGames).toEqual(['570']);
    });
  });

  describe('applyPendingFollowOverlayToGames()', () => {
    it('marque isFollowed sur les jeux concernés', () => {
      const games = [
        { appid: '730', name: 'CSGO', isFollowed: false },
        { appid: '570', name: 'Dota', isFollowed: true },
      ];
      const result = applyPendingFollowOverlayToGames(games, {
        '730': { appId: '730', steamId: STEAM, targetIsFollowed: true },
        '570': { appId: '570', steamId: STEAM, targetIsFollowed: false },
      });
      expect(result[0].isFollowed).toBe(true);
      expect(result[1].isFollowed).toBe(false);
    });

    it('renvoie games tel quel si pending vide', () => {
      const games = [{ appid: '730' }];
      const result = applyPendingFollowOverlayToGames(games, {});
      expect(result).toBe(games);
    });
  });

  describe('applyPendingFollowOverlayToFollowedGames()', () => {
    it('ajoute un nouveau jeu suivi', () => {
      const result = applyPendingFollowOverlayToFollowedGames([], {
        '730': {
          appId: '730',
          steamId: STEAM,
          targetIsFollowed: true,
          gameRef: { appId: '730', name: 'CSGO' },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ appId: '730', name: 'CSGO' });
    });

    it('retire un jeu unfollow', () => {
      const result = applyPendingFollowOverlayToFollowedGames(
        [{ appId: '730', name: 'CSGO' }],
        {
          '730': { appId: '730', steamId: STEAM, targetIsFollowed: false },
        },
      );
      expect(result).toEqual([]);
    });

    it('PRÉSERVE followedAt d\'un déjà-suivi (toggle cloche ne re-trie pas "Récents")', () => {
      const origin = '2026-06-01T10:00:00.000Z';
      const result = applyPendingFollowOverlayToFollowedGames(
        [{ appId: '730', name: 'CSGO', followedAt: origin }],
        {
          // Re-follow (toggle cloche) : la mutation porte un followedAt récent…
          '730': {
            appId: '730',
            steamId: STEAM,
            targetIsFollowed: true,
            notifications: false,
            gameRef: {
              appId: '730',
              name: 'CSGO',
              followedAt: '2026-06-12T23:00:00.000Z',
            },
          },
        },
      );
      // …mais la date d'origine est conservée → position de tri inchangée.
      expect(result[0].followedAt).toBe(origin);
    });
  });

  describe('applyPendingFollowOverlayToNewsFeed()', () => {
    it('filtre les news des jeux unfollow', () => {
      const news = [
        { appId: '730', news: { id: 'a' } },
        { appId: '570', news: { id: 'b' } },
      ];
      const result = applyPendingFollowOverlayToNewsFeed(news, {
        '730': { appId: '730', steamId: STEAM, targetIsFollowed: false },
      });
      expect(result.map((i) => i.appId)).toEqual(['570']);
    });

    it('ne filtre rien si que des follow', () => {
      const news = [{ appId: '730', news: {} }];
      const result = applyPendingFollowOverlayToNewsFeed(news, {
        '730': { appId: '730', steamId: STEAM, targetIsFollowed: true },
      });
      expect(result).toBe(news);
    });
  });

  describe('applyLocalFollowState()', () => {
    // Flush des microtasks pour laisser finir la persistance arrière-plan.
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    it('met à jour setUser/setGames SYNCHRONEMENT + persiste la mutation en arrière-plan', () => {
      const setUser = jest.fn();
      const setGames = jest.fn();

      const result = applyLocalFollowState({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
        setUser,
        setGames,
      });

      // Synchrone : l'état mémoire est appliqué immédiatement (pas d'await).
      expect(setUser).toHaveBeenCalledTimes(1);
      expect(setGames).toHaveBeenCalledTimes(1);
      expect(result?.appId).toBe('730');
    });

    it('persiste la mutation en file (en arrière-plan)', async () => {
      applyLocalFollowState({
        steamId: STEAM,
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
        setUser: jest.fn(),
        setGames: jest.fn(),
      });

      await flush();
      await flush();
      expect(
        await hasPendingFollowMutation({ steamId: STEAM, appId: '730' }),
      ).toBe(true);
    });

    it('renvoie null si appId invalide', () => {
      const r = applyLocalFollowState({
        steamId: STEAM,
        appId: '',
        targetIsFollowed: true,
      });
      expect(r).toBeNull();
    });
  });
});
