import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  changeAppLanguage,
  getCurrentAppLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from '../i18n';
import {debugError, showAlert} from './hooksLogger';
import {
  queueLanguagePreferenceSync,
  syncQueuedLanguagePreference,
} from '../services/languagePreferenceSync';

export const useAppLanguage = steamId => {
  const {t, i18n} = useTranslation();
  const [savingLanguage, setSavingLanguage] = useState(false);

  const appLanguage = useMemo(
    () => normalizeLanguage(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );

  const handleLanguageChange = useCallback(
    async language => {
      const nextLanguage = normalizeLanguage(language);

      if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
        return false;
      }

      if (nextLanguage === getCurrentAppLanguage()) {
        return true;
      }

      try {
        setSavingLanguage(true);
        await changeAppLanguage(nextLanguage);

        if (steamId) {
          try {
            await queueLanguagePreferenceSync(steamId, nextLanguage);
            syncQueuedLanguagePreference({steamId}).catch(error => {
              debugError('[i18n] background language sync failed', error);
            });
          } catch (syncError) {
            debugError('[i18n] language sync queue failed', syncError);
          }
        }

        return true;
      } catch (error) {
        debugError('[i18n] language update failed', error);
        showAlert(
          t('common.error'),
          t('settings.languageSaveError'),
        );
        return false;
      } finally {
        setSavingLanguage(false);
      }
    },
    [steamId, t],
  );

  return {
    appLanguage,
    savingLanguage,
    handleLanguageChange,
  };
};
