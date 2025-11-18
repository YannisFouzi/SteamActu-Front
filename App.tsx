/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CodePush from '@bravemobile/react-native-code-push';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import TutorialProvider from './src/tutorial/TutorialContext';
import CodePushUpdateModal from './src/components/CodePushUpdateModal';
import {
  getGitHubCodePushOptions,
  setUpdateModalStateSetter,
  notifyAppReady,
  getUpdateModalState,
  checkGitHubRepoExists,
} from './src/services/codePushService';

// Type pour l'état du modal de mise à jour
interface UpdateModalState {
  visible: boolean;
  progress: number;
  status: 'CHECKING' | 'DOWNLOADING' | 'INSTALLING' | 'RESTARTING';
  message: string | null;
}

function App(): React.JSX.Element {
  // État pour le modal de mise à jour
  const [updateModalState, setUpdateModalState] = useState<UpdateModalState>({
    visible: false,
    progress: 0,
    status: 'CHECKING',
    message: null,
  });

  // Initialiser le callback pour mettre à jour l'état du modal
  useEffect(() => {
    // Enregistrer le setter pour que codePushService puisse mettre à jour l'état
    setUpdateModalStateSetter(setUpdateModalState);

    // Récupérer l'état initial (au cas où une mise à jour est en cours)
    const initialState = getUpdateModalState() as UpdateModalState;
    if (initialState && initialState.visible) {
      setUpdateModalState(initialState);
    }

    // Notifier CodePush que l'app est prête
    notifyAppReady();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <TutorialProvider>
          <AppNavigator />
          {/* Modal de mise à jour CodePush - s'affiche automatiquement si mise à jour disponible */}
          <CodePushUpdateModal
            visible={updateModalState.visible}
            progress={updateModalState.progress}
            status={updateModalState.status}
            message={updateModalState.message ?? null}
          />
        </TutorialProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

// Configuration CodePush avec GitHub Releases
// CodePush sera désactivé si le repo n'existe pas (géré dans releaseHistoryFetcher)
const { APP_CONFIG } = require('./src/config/env');

let AppWithCodePush = App;

// Activer CodePush seulement si GITHUB_REPO est configuré
if (APP_CONFIG && APP_CONFIG.GITHUB_REPO && APP_CONFIG.GITHUB_REPO.trim() !== '') {
  try {
    const codePushOptions = getGitHubCodePushOptions({
      forceImmediateRestart: true, // Redémarrage immédiat (sécurité backend)
    });
    
    // Wrapper CodePush autour de l'app
    // Le releaseHistoryFetcher gérera le cas où le repo n'existe pas
    // @ts-expect-error - releaseHistoryFetcher retourne un format compatible mais TypeScript ne le reconnaît pas
    AppWithCodePush = CodePush(codePushOptions)(App);
  } catch (error) {
    console.warn('[CodePush] Configuration échouée, CodePush désactivé:', error);
    AppWithCodePush = App;
  }
} else {
  console.log('[CodePush] GITHUB_REPO non configuré - CodePush désactivé');
}

export default AppWithCodePush;
