// Mock axios pour intercepter create() et les méthodes HTTP
const createdInstances = [];

const buildInstance = () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      response: { use: jest.fn() },
      request: { use: jest.fn() },
    },
  };
  createdInstances.push(instance);
  return instance;
};

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(buildInstance) },
  create: jest.fn(buildInstance),
}));

jest.mock('../mobileSessionStore', () => ({
  getMobileSession: jest.fn(),
  clearMobileSession: jest.fn(),
}));

const {
  userService,
  newsService,
  steamService,
  steamAuthService,
  adminService,
  supportFeedbackService,
} = require('../api');
const { getMobileSession, clearMobileSession } = require('../mobileSessionStore');

const apiInstance = createdInstances[0]; // axios.create #1 = main API
const authInstance = createdInstances[1]; // axios.create #2 = auth API

// Capturé AVANT clearMocks: snapshot du module-load
const apiRequestInterceptor =
  apiInstance.interceptors.request.use.mock.calls[0][0];
const apiErrorInterceptor =
  apiInstance.interceptors.response.use.mock.calls[0][1];
const authErrorInterceptor =
  authInstance.interceptors.response.use.mock.calls[0][1];

describe('services/api', () => {
  beforeEach(() => {
    apiInstance.get.mockReset();
    apiInstance.post.mockReset();
    apiInstance.put.mockReset();
    apiInstance.delete.mockReset();
    authInstance.get.mockReset();
    authInstance.post.mockReset();
    getMobileSession.mockReset();
    clearMobileSession.mockReset();
  });

  describe('interceptors request (Bearer injection)', () => {
    it('injecte Authorization: Bearer <token> si session presente', async () => {
      getMobileSession.mockResolvedValue({ token: 'sess-tok' });
      const config = await apiRequestInterceptor({ headers: {} });
      expect(config.headers.Authorization).toBe('Bearer sess-tok');
    });

    it('n\'injecte rien si pas de session', async () => {
      getMobileSession.mockResolvedValue(null);
      const config = await apiRequestInterceptor({ headers: {} });
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('n\'ecrase pas un Authorization existant', async () => {
      getMobileSession.mockResolvedValue({ token: 'sess-tok' });
      const config = await apiRequestInterceptor({
        headers: { Authorization: 'Bearer custom' },
      });
      expect(config.headers.Authorization).toBe('Bearer custom');
    });

    it('ne throw pas si getMobileSession echoue', async () => {
      getMobileSession.mockRejectedValue(new Error('storage error'));
      const config = await apiRequestInterceptor({ headers: {} });
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('interceptors response (normalizeError)', () => {
    it('interceptor d\'erreur enregistré sur api + authApi', () => {
      expect(typeof apiErrorInterceptor).toBe('function');
      expect(typeof authErrorInterceptor).toBe('function');
    });

    it('normalise une erreur réseau (status 0) → message générique', () =>
      apiErrorInterceptor({ message: 'Network Error', config: {} }).catch(
        (normalized) => {
          expect(normalized.status).toBe(0);
          expect(typeof normalized.message).toBe('string');
          expect(normalized.original).toBeDefined();
        },
      ));

    it('normalise une erreur 500 → garde message du backend si présent', () =>
      apiErrorInterceptor({
        response: { status: 500, data: { message: 'mongo down' } },
        config: { url: '/x', method: 'get' },
      }).catch((normalized) => {
        expect(normalized.status).toBe(500);
        expect(normalized.message).toBe('mongo down');
      }));

    it('401 -> clearMobileSession appele puis erreur propagee', async () => {
      clearMobileSession.mockResolvedValue();
      await expect(
        apiErrorInterceptor({
          response: { status: 401, data: { message: 'unauth' } },
          config: { url: '/users/x', method: 'get' },
        }),
      ).rejects.toMatchObject({ status: 401 });
      expect(clearMobileSession).toHaveBeenCalled();
    });

    it('non-401 -> clearMobileSession PAS appele', async () => {
      await expect(
        apiErrorInterceptor({
          response: { status: 500 },
          config: { url: '/x', method: 'get' },
        }),
      ).rejects.toBeDefined();
      expect(clearMobileSession).not.toHaveBeenCalled();
    });
  });

  describe('userService', () => {
    it('register POST /users/register', () => {
      userService.register('76561197960287930', 'fr');
      expect(apiInstance.post).toHaveBeenCalledWith('/users/register', {
        steamId: '76561197960287930',
        language: 'fr',
      });
    });

    it('getUser GET /users/:id', () => {
      userService.getUser('id');
      expect(apiInstance.get).toHaveBeenCalledWith('/users/id');
    });

    it('followGame POST /users/:id/follow (notifié par défaut)', () => {
      userService.followGame('id', '730', 'CSGO', 'logo');
      expect(apiInstance.post).toHaveBeenCalledWith('/users/id/follow', {
        appId: '730',
        name: 'CSGO',
        logoUrl: 'logo',
        notifications: true,
      });
    });

    it('followGame avec notifications:false (suivi silencieux)', () => {
      userService.followGame('id', '730', 'CSGO', 'logo', false);
      expect(apiInstance.post).toHaveBeenCalledWith('/users/id/follow', {
        appId: '730',
        name: 'CSGO',
        logoUrl: 'logo',
        notifications: false,
      });
    });

    it('setFollowNotifications PUT /users/:id/follow/:appId/notifications', () => {
      userService.setFollowNotifications('id', '730', false);
      expect(apiInstance.put).toHaveBeenCalledWith(
        '/users/id/follow/730/notifications',
        {enabled: false},
      );
    });

    it('unfollowGame DELETE /users/:id/follow/:appId', () => {
      userService.unfollowGame('id', '730');
      expect(apiInstance.delete).toHaveBeenCalledWith('/users/id/follow/730');
    });

    it('updateNotificationSettings PUT', () => {
      userService.updateNotificationSettings('id', { newsNotifications: true });
      expect(apiInstance.put).toHaveBeenCalledWith('/users/id/notifications', {
        newsNotifications: true,
      });
    });

    it('updateLanguage PUT /users/:id/language', () => {
      userService.updateLanguage('id', 'en');
      expect(apiInstance.put).toHaveBeenCalledWith('/users/id/language', {
        language: 'en',
      });
    });

    it('registerFCMToken POST /users/:id/fcm-token', () => {
      userService.registerFCMToken('id', 'tok', 'android');
      expect(apiInstance.post).toHaveBeenCalledWith('/users/id/fcm-token', {
        token: 'tok',
        platform: 'android',
      });
    });

    it('unregisterFCMToken DELETE avec body', () => {
      userService.unregisterFCMToken('id', 'tok');
      expect(apiInstance.delete).toHaveBeenCalledWith('/users/id/fcm-token', {
        data: { token: 'tok' },
      });
    });

    it('deleteAccount DELETE /users/:id', () => {
      userService.deleteAccount('id');
      expect(apiInstance.delete).toHaveBeenCalledWith('/users/id');
    });

    it('markNewsFeedSeen PUT /users/:id/news/seen', () => {
      userService.markNewsFeedSeen('id', '2026-05-19');
      expect(apiInstance.put).toHaveBeenCalledWith('/users/id/news/seen', {
        seenAt: '2026-05-19',
      });
    });

    it('addNewsFavorite POST', () => {
      userService.addNewsFavorite('id', { appId: '730', newsId: 'n1' });
      expect(apiInstance.post).toHaveBeenCalledWith('/users/id/news-favorites', {
        appId: '730',
        newsId: 'n1',
      });
    });
  });

  describe('newsService', () => {
    it('getNewsFeed GET /news/feed avec params', () => {
      newsService.getNewsFeed('76561197960287930', { language: 'fr' });
      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/news/feed');
      expect(call).toBeTruthy();
      expect(call[1].params.steamId).toBe('76561197960287930');
      expect(call[1].params.language).toBe('fr');
    });

    it('omet steamId si absent', () => {
      newsService.getNewsFeed(undefined, { language: 'en' });
      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/news/feed');
      expect(call[1].params.steamId).toBeUndefined();
    });

    it('ajoute favoritesOnly=true uniquement si truthy', () => {
      newsService.getNewsFeed('id', { favoritesOnly: true });
      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/news/feed');
      expect(call[1].params.favoritesOnly).toBe(true);

      apiInstance.get.mockClear();
      newsService.getNewsFeed('id', { favoritesOnly: false });
      const call2 = apiInstance.get.mock.calls.find((c) => c[0] === '/news/feed');
      expect(call2[1].params.favoritesOnly).toBeUndefined();
    });
  });

  describe('steamService', () => {
    it.each([
      ['getUserGames', 'get', '/steam/games/id'],
      ['getUserWishlist', 'get', '/steam/wishlist/id'],
      ['fetchStatus', 'get', '/steam/status/id'],
    ])('%s appelle %s %s avec config par défaut', (method, verb, expectedUrl) => {
      steamService[method]('id');
      expect(apiInstance[verb]).toHaveBeenCalledWith(expectedUrl, {});
    });

    it('getProfile GET /steam/profile/:id (sans config)', () => {
      steamService.getProfile('id');
      expect(apiInstance.get).toHaveBeenCalledWith('/steam/profile/id');
    });

    it('checkVisibility POST', () => {
      steamService.checkVisibility('id');
      expect(apiInstance.post).toHaveBeenCalledWith('/steam/check-visibility/id');
    });

    it('checkWishlistVisibility POST', () => {
      steamService.checkWishlistVisibility('id');
      expect(apiInstance.post).toHaveBeenCalledWith(
        '/steam/check-wishlist-visibility/id',
      );
    });

    it('searchGames GET /steam/search avec q/limit', () => {
      steamService.searchGames('csgo', 7);
      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/steam/search');
      expect(call[1].params).toEqual({ q: 'csgo', limit: 7 });
    });
  });

  describe('supportFeedbackService', () => {
    it('submit POST /feedback avec timeout 15s', () => {
      supportFeedbackService.submit({ type: 'bug', message: 'x' });
      expect(apiInstance.post).toHaveBeenCalledWith(
        '/feedback',
        { type: 'bug', message: 'x' },
        { timeout: 15000 },
      );
    });
  });

  describe('adminService', () => {
    it('throw 401 si pas de session', async () => {
      getMobileSession.mockResolvedValue(null);
      await expect(adminService.getAccess()).rejects.toMatchObject({ status: 401 });
      await expect(adminService.getStats()).rejects.toMatchObject({ status: 401 });
    });

    it('getAccess GET /admin/access avec Authorization Bearer', async () => {
      getMobileSession.mockResolvedValue({ token: 'mob-tok' });
      apiInstance.get.mockResolvedValue({ data: { isAdmin: true } });

      await adminService.getAccess();

      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/admin/access');
      expect(call[1].headers.Authorization).toBe('Bearer mob-tok');
    });

    it('getStats GET /admin/stats avec timeout 15s', async () => {
      getMobileSession.mockResolvedValue({ token: 'mob-tok' });
      apiInstance.get.mockResolvedValue({ data: {} });

      await adminService.getStats();

      const call = apiInstance.get.mock.calls.find((c) => c[0] === '/admin/stats');
      expect(call[1].timeout).toBe(15000);
    });
  });

  describe('steamAuthService', () => {
    it('startAuth POST /auth/steam/start', async () => {
      authInstance.post.mockResolvedValue({ data: { authToken: 'tok' } });
      const r = await steamAuthService.startAuth();
      expect(authInstance.post).toHaveBeenCalledWith('/auth/steam/start');
      expect(r).toEqual({ authToken: 'tok' });
    });

    it('checkAuthStatus GET /auth/steam/status/:token', async () => {
      authInstance.get.mockResolvedValue({ data: { status: 'pending' } });
      const r = await steamAuthService.checkAuthStatus('tok');
      expect(authInstance.get).toHaveBeenCalledWith('/auth/steam/status/tok');
      expect(r).toEqual({ status: 'pending' });
    });

    it('AUTH_REDIRECT_URL = APP_SCHEME + "auth"', () => {
      expect(steamAuthService.AUTH_REDIRECT_URL).toMatch(/auth$/);
    });
  });
});
