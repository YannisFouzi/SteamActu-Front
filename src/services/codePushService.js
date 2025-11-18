/**
 * Service de gestion des mises à jour Over-The-Air via CodePush
 * Gère la détection, téléchargement et installation des mises à jour
 * avec feedback visuel pour l'utilisateur
 */

import CodePush, {
    CheckFrequency,
    InstallMode,
    SyncStatus,
} from '@bravemobile/react-native-code-push';
import { Platform } from 'react-native';
import { debugError, debugLog, showAlert } from '../hooks/hooksLogger';
import { APP_CONFIG } from '../config/env';

/**
 * État global pour l'écran de mise à jour
 * Permet de synchroniser l'état entre CodePush et le composant UI
 */
let updateModalStateData = {
  visible: false,
  progress: 0,
  status: 'CHECKING',
  message: null,
};

let updateModalStateSetter = null;

/**
 * Définit la fonction de callback pour mettre à jour l'état du modal
 * @param {Function} setter - Fonction pour mettre à jour l'état
 */
export function setUpdateModalStateSetter(setter) {
  updateModalStateSetter = setter;
}

/**
 * Met à jour l'état du modal de mise à jour
 * @param {Object} newState - Nouvel état
 */
function updateModalState(newState) {
  updateModalStateData = { ...updateModalStateData, ...newState };
  if (updateModalStateSetter) {
    updateModalStateSetter(updateModalStateData);
  }
}

/**
 * Configuration CodePush avec feedback utilisateur
 * 
 * ⚠️ IMPORTANT : Si le frontend est lié au backend (changements d'API, structure de données, etc.),
 * il faut forcer le redémarrage immédiat pour éviter des bugs d'incompatibilité.
 * 
 * @param {Object} options - Options de configuration
 * @param {boolean} options.forceImmediateRestart - Si true, redémarre immédiatement (pour compatibilité backend)
 * @param {boolean} options.mandatoryUpdate - Si true, rend la mise à jour obligatoire
 */
export const getCodePushOptions = (options = {}) => {
  const {
    forceImmediateRestart = true, // Par défaut : mise à jour optionnelle
  } = options;

  return {
    // Vérifier les mises à jour au démarrage de l'app
    checkFrequency: CheckFrequency.ON_APP_START,

    // ⚠️ CRITIQUE : Si frontend lié au backend → redémarrage immédiat
    // Sinon → redémarrage au prochain restart (ON_NEXT_RESTART)
    installMode: forceImmediateRestart
      ? InstallMode.IMMEDIATE
      : InstallMode.ON_NEXT_RESTART,

    // Si mise à jour obligatoire → installer immédiatement
    mandatoryInstallMode: InstallMode.IMMEDIATE,

    // Dialog de mise à jour (optionnel, s'affiche si update disponible)
    // ⚠️ Si forceImmediateRestart = true, le dialog ne s'affiche pas (redémarrage automatique)
    ...(forceImmediateRestart
      ? {} // Pas de dialog si redémarrage immédiat
      : {
          updateDialog: {
            appendReleaseDescription: true,
            descriptionPrefix: '✨ ',
            mandatoryUpdateMessage:
              'Une mise à jour obligatoire est disponible. L\'app va redémarrer automatiquement.',
            optionalIgnoreButtonLabel: 'Plus tard',
            optionalInstallButtonLabel: 'Redémarrer maintenant',
            optionalUpdateMessage:
              'Une nouvelle version est disponible. Voulez-vous redémarrer maintenant pour l\'appliquer ?',
            title: '🎮 Mise à jour disponible',
          },
        }),

    // Callbacks pour logging et feedback
    onUpdateSuccess: () => {
      debugLog('[CodePush] ✅ Mise à jour installée avec succès');
      
      // Mettre à jour l'état du modal
      updateModalState({
        visible: true,
        status: 'RESTARTING',
        progress: 100,
        message: 'Mise à jour installée. Redémarrage en cours...',
      });
      
      // Si redémarrage immédiat → afficher un message avant redémarrage
      if (forceImmediateRestart) {
        debugLog('[CodePush] 🔄 Redémarrage immédiat dans 2 secondes...');
        // Le redémarrage se fera automatiquement via UPDATE_INSTALLED
      }
    },

    onSyncError: error => {
      // Ne pas logger comme erreur critique si c'est juste un repo inexistant ou pas de mise à jour
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('no latest release') || 
          errorMessage.includes('non trouvé') || 
          errorMessage.includes('non configuré') ||
          errorMessage.includes('404')) {
        debugLog('[CodePush] ℹ️ Aucune mise à jour disponible');
      } else {
        debugError('[CodePush] ❌ Erreur de synchronisation:', error);
      }
      // Masquer le modal en cas d'erreur
      updateModalState({
        visible: false,
        status: 'CHECKING',
        progress: 0,
        message: null,
      });
      // Optionnel : afficher une alerte d'erreur à l'utilisateur
      // showAlert('Erreur de mise à jour', 'Impossible de vérifier les mises à jour.');
    },

    onDownloadStart: () => {
      debugLog('[CodePush] 📥 Début du téléchargement...');
      updateModalState({
        visible: true,
        status: 'DOWNLOADING',
        progress: 0,
        message: 'Téléchargement de la mise à jour...',
      });
    },

    onDownloadProgress: progress => {
      const percent = Math.round(
        (progress.receivedBytes / progress.totalBytes) * 100,
      );
      debugLog(`[CodePush] 📥 Téléchargement: ${percent}%`);
      
      // Mettre à jour l'état du modal avec la progression
      updateModalState({
        visible: true,
        status: 'DOWNLOADING',
        progress: percent,
        message: `Téléchargement de la mise à jour... ${percent}%`,
      });
    },

    onInstallStart: () => {
      debugLog('[CodePush] 🔄 Installation de la mise à jour...');
      updateModalState({
        visible: true,
        status: 'INSTALLING',
        progress: 100,
        message: 'Installation de la mise à jour...',
      });
    },

    onUpdateRollback: () => {
      debugError('[CodePush] ⚠️ Rollback effectué (mise à jour corrompue)');
      updateModalState({
        visible: false,
        status: 'CHECKING',
        progress: 0,
        message: null,
      });
      showAlert(
        'Mise à jour annulée',
        'La dernière mise à jour a causé un problème. L\'app est revenue à la version précédente.',
      );
    },
  };
};

/**
 * Vérifie manuellement s'il y a une mise à jour disponible
 * @returns {Promise<Object|null>} Informations sur la mise à jour ou null
 */
export async function checkForUpdate() {
  try {
    debugLog('[CodePush] 🔍 Vérification manuelle des mises à jour...');
    const update = await CodePush.checkForUpdate();
    
    if (update) {
      debugLog('[CodePush] ✅ Mise à jour disponible:', update.label);
      return {
        available: true,
        label: update.label,
        description: update.description,
        isMandatory: update.isMandatory,
        packageSize: update.packageSize,
      };
    } else {
      debugLog('[CodePush] ℹ️ Aucune mise à jour disponible');
      return { available: false };
    }
  } catch (error) {
    debugError('[CodePush] ❌ Erreur lors de la vérification:', error);
    return null;
  }
}

/**
 * Synchronise l'app avec le serveur CodePush (check + download + install)
 * @param {Object} options - Options de synchronisation
 * @param {Function} statusCallback - Callback appelé à chaque changement de statut
 * @param {Function} progressCallback - Callback appelé pendant le téléchargement
 * @returns {Promise<SyncStatus>} Statut final de la synchronisation
 */
export async function syncUpdate(
  options = {},
  statusCallback = null,
  progressCallback = null,
) {
  try {
    debugLog('[CodePush] 🔄 Démarrage de la synchronisation...');

    const syncOptions = {
      installMode: InstallMode.ON_NEXT_RESTART,
      ...options,
    };

    const status = await CodePush.sync(
      syncOptions,
      status => {
        debugLog(`[CodePush] 📊 Statut: ${getStatusLabel(status)}`);
        
        if (statusCallback) {
          statusCallback(status);
        }

        // Afficher des messages selon le statut
        switch (status) {
          case SyncStatus.CHECKING_FOR_UPDATE:
            debugLog('[CodePush] 🔍 Vérification des mises à jour...');
            updateModalState({
              visible: true,
              status: 'CHECKING',
              progress: 0,
              message: 'Vérification des mises à jour...',
            });
            break;
          case SyncStatus.DOWNLOADING_PACKAGE:
            debugLog('[CodePush] 📥 Téléchargement en cours...');
            updateModalState({
              visible: true,
              status: 'DOWNLOADING',
              progress: 0,
              message: 'Téléchargement de la mise à jour...',
            });
            break;
          case SyncStatus.INSTALLING_UPDATE:
            debugLog('[CodePush] 🔄 Installation en cours...');
            updateModalState({
              visible: true,
              status: 'INSTALLING',
              progress: 100,
              message: 'Installation de la mise à jour...',
            });
            break;
          case SyncStatus.UP_TO_DATE:
            debugLog('[CodePush] ✅ L\'app est à jour');
            updateModalState({
              visible: false,
              status: 'CHECKING',
              progress: 0,
              message: null,
            });
            break;
          case SyncStatus.UPDATE_INSTALLED:
            debugLog('[CodePush] ✅ Mise à jour installée avec succès');
            
            // Mettre à jour l'état du modal
            updateModalState({
              visible: true,
              status: 'RESTARTING',
              progress: 100,
              message: 'Mise à jour installée. Redémarrage en cours...',
            });

            // Si redémarrage immédiat forcé → redémarrer automatiquement
            if (syncOptions.installMode === InstallMode.IMMEDIATE) {
              debugLog('[CodePush] 🔄 Redémarrage immédiat (compatibilité backend)');
              // Petit délai pour laisser l'utilisateur voir le message
              setTimeout(() => {
                CodePush.restartApp();
              }, 2000);
            } else {
              // Sinon → proposer le redémarrage
              showAlert(
                'Mise à jour installée',
                'La mise à jour sera appliquée au prochain redémarrage de l\'app.',
                [
                  {
                    text: 'Redémarrer maintenant',
                    onPress: () => CodePush.restartApp(),
                  },
                  {
                    text: 'Plus tard',
                    style: 'cancel',
                  },
                ],
              );
            }
            break;
          case SyncStatus.UPDATE_IGNORED:
            debugLog('[CodePush] ⏭️ Mise à jour ignorée par l\'utilisateur');
            updateModalState({
              visible: false,
              status: 'CHECKING',
              progress: 0,
              message: null,
            });
            break;
          case SyncStatus.UNKNOWN_ERROR:
            debugError('[CodePush] ❌ Erreur inconnue');
            updateModalState({
              visible: false,
              status: 'CHECKING',
              progress: 0,
              message: null,
            });
            break;
        }
      },
      progress => {
        const percent = Math.round(
          (progress.receivedBytes / progress.totalBytes) * 100,
        );
        debugLog(`[CodePush] 📥 Progression: ${percent}%`);
        
        if (progressCallback) {
          progressCallback(progress);
        }
      },
    );

    return status;
  } catch (error) {
    debugError('[CodePush] ❌ Erreur lors de la synchronisation:', error);
    throw error;
  }
}

/**
 * Récupère les métadonnées de la mise à jour actuellement installée
 * @returns {Promise<Object|null>} Métadonnées ou null
 */
export async function getUpdateMetadata() {
  try {
    const metadata = await CodePush.getUpdateMetadata();
    if (metadata) {
      debugLog('[CodePush] 📦 Métadonnées:', {
        label: metadata.label,
        description: metadata.description,
        installedOn: metadata.installedOn,
        appVersion: metadata.appVersion,
      });
    }
    return metadata;
  } catch (error) {
    debugError('[CodePush] ❌ Erreur récupération métadonnées:', error);
    return null;
  }
}

/**
 * Redémarre l'app immédiatement (pour appliquer une mise à jour)
 */
export function restartApp() {
  debugLog('[CodePush] 🔄 Redémarrage de l\'app...');
  CodePush.restartApp();
}

/**
 * Notifie CodePush que l'app est prête (OBLIGATOIRE après chaque update)
 * À appeler dans useEffect/componentDidMount du composant racine
 */
export function notifyAppReady() {
  CodePush.notifyAppReady();
  debugLog('[CodePush] ✅ App notifiée comme prête');
  // Masquer le modal après que l'app soit prête
  updateModalState({
    visible: false,
    status: 'CHECKING',
    progress: 0,
    message: null,
  });
}

/**
 * Récupère l'état actuel du modal de mise à jour
 * @returns {Object} État actuel du modal
 */
export function getUpdateModalState() {
  return { ...updateModalStateData };
}

/**
 * Convertit un statut SyncStatus en label lisible
 */
function getStatusLabel(status) {
  const labels = {
    [SyncStatus.CHECKING_FOR_UPDATE]: 'Vérification...',
    [SyncStatus.DOWNLOADING_PACKAGE]: 'Téléchargement...',
    [SyncStatus.INSTALLING_UPDATE]: 'Installation...',
    [SyncStatus.UP_TO_DATE]: 'À jour',
    [SyncStatus.UPDATE_INSTALLED]: 'Installé',
    [SyncStatus.UPDATE_IGNORED]: 'Ignoré',
    [SyncStatus.UNKNOWN_ERROR]: 'Erreur',
    [SyncStatus.SYNC_IN_PROGRESS]: 'En cours...',
  };
  return labels[status] || 'Inconnu';
}

/**
 * Vérifie si le repository GitHub existe et a des releases
 * @param {string} repo - Repository au format 'username/repo'
 * @param {string} token - Token GitHub optionnel
 * @returns {Promise<boolean>} true si le repo existe et a des releases
 */
export async function checkGitHubRepoExists(repo, token = null) {
  try {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const headers = token ? { Authorization: `token ${token}` } : {};
    const response = await fetch(url, { headers });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Configuration pour GitHub Releases (si tu utilises la solution GitHub)
 * 
 * @param {Object} options - Options de configuration (même que getCodePushOptions)
 */
export const getGitHubCodePushOptions = (options = {}) => {
  return {
    ...getCodePushOptions(options),
    // Custom releaseHistoryFetcher pour GitHub
    releaseHistoryFetcher: async updateRequest => {
      try {
        // Récupérer la version de l'app depuis updateRequest (CodePush la fournit automatiquement)
        // Si absente, utiliser '1.0' pour correspondre à versionName dans build.gradle
        const app_version = updateRequest?.app_version || updateRequest?.appVersion || '1.0';
        
        // Récupérer APP_CONFIG de manière sécurisée
        // Utiliser import dynamique pour éviter les problèmes de timing au démarrage
        let config;
        try {
          // Essayer d'abord l'import statique
          if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG) {
            config = APP_CONFIG;
          } else {
            // Fallback : import dynamique
            const envModule = await import('../config/env');
            config = envModule.APP_CONFIG;
          }
        } catch (e) {
          // Si les deux échouent, utiliser import dynamique
          const envModule = await import('../config/env');
          config = envModule.APP_CONFIG;
        }
        
        if (!config) {
          debugLog('[CodePush] ℹ️ APP_CONFIG non disponible');
          // Retourner un objet vide pour indiquer qu'il n'y a pas de mise à jour
          // CodePush considérera qu'il n'y a pas de mise à jour disponible
          throw new Error('APP_CONFIG non disponible');
        }
        
        const { GITHUB_REPO, GITHUB_TOKEN } = config;

        if (!GITHUB_REPO || GITHUB_REPO.trim() === '') {
          debugLog('[CodePush] ℹ️ GITHUB_REPO non configuré');
          // Retourner une erreur pour que CodePush sache qu'il n'y a pas de mise à jour
          throw new Error('GITHUB_REPO non configuré');
        }

        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
        const headers = GITHUB_TOKEN
          ? { Authorization: `token ${GITHUB_TOKEN}` }
          : {};

        debugLog('[CodePush] 🔍 Vérification GitHub Releases...', url);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          // Si 404, le repo n'existe pas ou n'a pas de releases
          if (response.status === 404) {
            debugLog('[CodePush] ℹ️ Repository GitHub non trouvé ou sans releases');
            // Lancer une erreur pour que CodePush sache qu'il n'y a pas de mise à jour disponible
            // Cette erreur sera catchée et gérée silencieusement
            throw new Error('Repository GitHub non trouvé ou sans releases');
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const release = await response.json();
        const bundleAsset = release.assets.find(asset =>
          asset.name.includes('index.android.bundle'),
        );

        if (!bundleAsset) {
          debugLog('[CodePush] ℹ️ Aucun bundle Android trouvé dans le release');
          // Lancer une erreur pour indiquer qu'il n'y a pas de mise à jour disponible
          throw new Error('Aucun bundle Android trouvé dans le release');
        }

        // Générer un packageHash unique à partir du SHA du commit ou du tag
        // CodePush utilise le packageHash pour identifier de manière unique chaque release
        const packageHash = release.tag_name.replace(/^v/, '').substring(0, 40) || release.id.toString();
        
        // Extraire ou générer un label de version sémantique
        // Si le tag contient un numéro (ex: v2-xxx), utiliser "1.0.X" où X est le numéro
        // Sinon, utiliser le tag tel quel
        let label = release.tag_name;
        const versionMatch = release.tag_name.match(/v?(\d+)/);
        if (versionMatch) {
          const runNumber = versionMatch[1];
          // Générer une version sémantique basée sur le numéro de run
          // Ex: v2-xxx -> 1.0.2, v1-xxx -> 1.0.1
          label = `1.0.${runNumber}`;
        } else {
          // Si pas de numéro, utiliser le tag sans le préfixe 'v'
          label = release.tag_name.replace(/^v/, '');
        }

        // Logs de débogage AVANT le return
        console.log('[CodePush] ✅ Release trouvé:', release.tag_name);
        console.log('[CodePush] 📦 Version app:', app_version, 'Label release:', label);
        console.log('[CodePush] 🔗 Download URL:', bundleAsset.browser_download_url);
        console.log('[CodePush] 🔑 PackageHash:', packageHash);
        
        debugLog('[CodePush] ✅ Release trouvé:', release.tag_name);
        debugLog('[CodePush] 📦 Version app:', app_version, 'Label release:', label);

        // CodePush attend un format avec releaseHistory (tableau)
        // IMPORTANT: Le appVersion doit correspondre à la versionName de l'app dans build.gradle
        // CodePush compare appVersion pour déterminer si la release est compatible
        const releaseData = {
          releaseHistory: [
            {
              downloadURL: bundleAsset.browser_download_url,
              packageHash: packageHash,
              label: label,
              packageSize: bundleAsset.size,
              isMandatory: false,
              appVersion: app_version, // Doit correspondre à versionName dans build.gradle
              description: release.body || release.name || '',
            },
          ],
        };
        
        console.log('[CodePush] 📤 Retour releaseHistory:', JSON.stringify(releaseData, null, 2));
        debugLog('[CodePush] 📤 Retour releaseHistory:', JSON.stringify(releaseData, null, 2));
        return releaseData;
      } catch (error) {
        // Ne pas logger comme erreur critique - ce sont des cas normaux (repo inexistant, pas de bundle, etc.)
        if (error.message && (
          error.message.includes('404') || 
          error.message.includes('non trouvé') || 
          error.message.includes('non configuré') ||
          error.message.includes('Aucun bundle')
        )) {
          debugLog('[CodePush] ℹ️', error.message);
        } else {
          debugError('[CodePush] ❌ Erreur fetch GitHub Release:', error);
        }
        // Retourner un tableau vide pour indiquer qu'il n'y a pas de mise à jour
        // CodePush considérera qu'il n'y a pas de mise à jour disponible sans lancer d'erreur
        return {
          releaseHistory: [],
        };
      }
    },
  };
};

