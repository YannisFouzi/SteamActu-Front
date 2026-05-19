import {
  registerNavigationRef,
  unregisterNavigationRef,
  getNavigationRef,
  navigateToFollowedGamesTab,
} from '../navigationService';

function makeRef(opts = {}) {
  return {
    isReady: jest.fn().mockReturnValue(opts.ready ?? true),
    getRootState: jest.fn().mockReturnValue({
      routeNames: opts.routeNames ?? ['Home', 'Login'],
    }),
    navigate: jest.fn(),
  };
}

describe('services/navigationService', () => {
  afterEach(() => {
    unregisterNavigationRef(getNavigationRef());
  });

  it('register/get/unregister du ref', () => {
    const ref = makeRef();
    registerNavigationRef(ref);
    expect(getNavigationRef()).toBe(ref);

    unregisterNavigationRef(ref);
    expect(getNavigationRef()).toBeNull();
  });

  it('unregisterNavigationRef ne touche pas si ref différent', () => {
    const a = makeRef();
    const b = makeRef();
    registerNavigationRef(a);
    unregisterNavigationRef(b);
    expect(getNavigationRef()).toBe(a);
  });

  describe('navigateToFollowedGamesTab', () => {
    it('renvoie false si pas de ref', () => {
      expect(navigateToFollowedGamesTab()).toBe(false);
    });

    it('renvoie false si navigation pas prête', () => {
      const ref = makeRef({ ready: false });
      registerNavigationRef(ref);
      expect(navigateToFollowedGamesTab()).toBe(false);
      expect(ref.navigate).not.toHaveBeenCalled();
    });

    it('renvoie false si "Home" pas dans routeNames', () => {
      const ref = makeRef({ routeNames: ['Login'] });
      registerNavigationRef(ref);
      expect(navigateToFollowedGamesTab()).toBe(false);
    });

    it('navigue vers Home → Actu → JeuxSuivis avec params', () => {
      const ref = makeRef();
      registerNavigationRef(ref);

      expect(navigateToFollowedGamesTab({ appId: '730' })).toBe(true);
      expect(ref.navigate).toHaveBeenCalledWith('Home', {
        screen: 'Actu',
        params: {
          screen: 'JeuxSuivis',
          params: { appId: '730' },
        },
      });
    });

    it('renvoie false si navigate throw', () => {
      const ref = makeRef();
      ref.navigate.mockImplementation(() => {
        throw new Error('boom');
      });
      registerNavigationRef(ref);
      expect(navigateToFollowedGamesTab()).toBe(false);
    });

    it('renvoie false si getRootState throw', () => {
      const ref = makeRef();
      ref.getRootState.mockImplementation(() => {
        throw new Error('boom');
      });
      registerNavigationRef(ref);
      expect(navigateToFollowedGamesTab()).toBe(false);
    });
  });
});
