jest.doMock('../../services/languagePreferenceSync', () => ({
  queueLanguagePreferenceSync: jest.fn().mockResolvedValue(true),
  syncQueuedLanguagePreference: jest.fn().mockResolvedValue(true),
}));

const { renderHook, act, waitFor } = require('@testing-library/react-native');
const i18n = require('../../i18n').default;
const { useAppLanguage } = require('../useAppLanguage');
const {
  queueLanguagePreferenceSync,
  syncQueuedLanguagePreference,
} = require('../../services/languagePreferenceSync');

describe('hooks/useAppLanguage', () => {
  beforeEach(async () => {
    queueLanguagePreferenceSync.mockClear();
    syncQueuedLanguagePreference.mockClear();
    await i18n.changeLanguage('fr');
  });

  it('appLanguage = langue courante i18n', () => {
    const { result } = renderHook(() => useAppLanguage('76561197960287930'));
    expect(result.current.appLanguage).toBe('fr');
    expect(result.current.savingLanguage).toBe(false);
  });

  it('langue non standard normalise vers fallback (en) au lieu de rejeter', async () => {
    // normalizeLanguage('jp') → 'en' (fallback default), donc accepté
    const { result } = renderHook(() => useAppLanguage('76561197960287930'));
    let ok;
    await act(async () => {
      ok = await result.current.handleLanguageChange('jp');
    });
    expect(ok).toBe(true);
    expect(queueLanguagePreferenceSync).toHaveBeenCalledWith(
      '76561197960287930',
      'en',
    );
  });

  it('renvoie true sans rien faire si même langue', async () => {
    const { result } = renderHook(() => useAppLanguage('76561197960287930'));
    let ok;
    await act(async () => {
      ok = await result.current.handleLanguageChange('fr');
    });
    expect(ok).toBe(true);
    expect(queueLanguagePreferenceSync).not.toHaveBeenCalled();
  });

  it('change la langue, queue le sync et retourne true', async () => {
    const { result } = renderHook(() => useAppLanguage('76561197960287930'));
    let ok;
    await act(async () => {
      ok = await result.current.handleLanguageChange('en');
    });
    expect(ok).toBe(true);
    expect(queueLanguagePreferenceSync).toHaveBeenCalledWith(
      '76561197960287930',
      'en',
    );
    await waitFor(() => {
      expect(syncQueuedLanguagePreference).toHaveBeenCalledWith({
        steamId: '76561197960287930',
      });
    });
  });

  it('sans steamId, change la langue mais ne queue pas', async () => {
    const { result } = renderHook(() => useAppLanguage(null));
    let ok;
    await act(async () => {
      ok = await result.current.handleLanguageChange('de');
    });
    expect(ok).toBe(true);
    expect(queueLanguagePreferenceSync).not.toHaveBeenCalled();
  });
});
