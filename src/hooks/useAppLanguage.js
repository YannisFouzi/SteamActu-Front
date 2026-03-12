import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  changeAppLanguage,
  getCurrentAppLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from '../i18n';
import {debugError, showAlert} from './hooksLogger';
import {userService} from '../services/api';

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

      const previousLanguage = getCurrentAppLanguage();

      try {
        setSavingLanguage(true);
        await changeAppLanguage(nextLanguage);

        if (steamId) {
          await userService.updateLanguage(steamId, nextLanguage);
        }

        return true;
      } catch (error) {
        debugError('[i18n] language update failed', error);
        await changeAppLanguage(previousLanguage);
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
