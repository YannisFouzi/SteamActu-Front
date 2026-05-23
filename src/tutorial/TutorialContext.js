import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import FollowModePromptModal from './FollowModePromptModal';
import TutorialOverlay from './TutorialOverlay';
import TutorialResumeModal from './TutorialResumeModal';
import { SUMMARY_STEP_INDEX, TUTORIAL_STEPS } from './steps';
import { TUTORIAL_CONFIG } from '../config/tutorial';

const STORAGE_KEY = '@steam-actu/tutorial-status';

// Au-delà de cet index, l'utilisateur est arrivé sur la zone Settings du
// tuto (étape 6 et suivantes) : "Passer" ferme alors le tuto sans relancer
// de modale puisqu'il a déjà vu — ou est sur le point de voir — les
// options de suivi.
const SKIP_PROMPT_MAX_INDEX = 4;

const TutorialContext = createContext(null);

const INITIAL_STATE = {
  status: 'idle', // idle | running | paused | completed
  stepIndex: 0,
  skipped: false,
  completed: false,
  startedAt: null,
  completedAt: null,
  lastPausedAt: null,
};

const TutorialProvider = ({ children }) => {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  const navigationRef = useRef(null);
  const layoutsRef = useRef({});
  const [, setLayoutVersion] = useState(0);

  const [resumeVisible, setResumeVisible] = useState(false);
  const [followPromptVisible, setFollowPromptVisible] = useState(false);
  const [measureNonce, setMeasureNonce] = useState(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(async nextState => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.warn('[Tutorial] impossible de sauvegarder le statut', error);
    }
  }, []);

  const applyState = useCallback(
    (updater, { persist = true } = {}) => {
      setState(prev => {
        const next =
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        if (persist && hydratedRef.current) {
          persistState(next);
        }
        return next;
      });
    },
    [persistState],
  );

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          applyState(
            prev => ({
              ...prev,
              ...parsed,
              status: 'idle',
            }),
            { persist: false },
          );
        }
      } catch (error) {
        // ignore
      } finally {
        hydratedRef.current = true;
        setHydrated(true);
      }
    };

    loadStatus();
  }, [applyState]);

  const registerNavigationRef = useCallback(ref => {
    navigationRef.current = ref;
  }, []);

  const ensureNavigationForStep = useCallback(step => {
    if (!step) {
      return;
    }
    const ref = navigationRef.current;
    if (!ref) {
      return;
    }

    const navigateToNested = (tabName, nestedScreen) => {
      try {
        ref.navigate('Home', {
          screen: tabName,
          params: nestedScreen ? {screen: nestedScreen} : undefined,
        });
      } catch (error) {
        console.warn('[Tutorial] navigation error', error);
      }
    };

    if (step.screen === 'Actu') {
      navigateToNested('Actu', step.targetTab || 'Fil');
      return;
    }

    if (step.screen === 'SuivreUnJeu') {
      navigateToNested('SuivreUnJeu', step.targetTab || 'MesJeux');
      return;
    }

    if (step.screen === 'MonCompte') {
      navigateToNested('MonCompte', 'Settings');
      return;
    }

    if (step.screen === 'Settings') {
      navigateToNested('MonCompte', 'Settings');
      return;
    }

    try {
      ref.navigate(step.screen);
    } catch (error) {
      console.warn('[Tutorial] navigation error', error);
    }
  }, []);

  const registerTarget = useCallback((id, layout) => {
    if (!id || !layout) {
      return;
    }
    layoutsRef.current[id] = layout;
    setLayoutVersion(version => version + 1);
  }, []);

  const unregisterTarget = useCallback(id => {
    if (!id) {
      return;
    }
    delete layoutsRef.current[id];
    setLayoutVersion(version => version + 1);
  }, []);

  // Force les TutorialTarget montés à se re-mesurer (ex. après un scroll
  // programmatique qui déplace une cible sans déclencher onLayout).
  const requestMeasure = useCallback(() => {
    setMeasureNonce(nonce => nonce + 1);
  }, []);

  const startTutorial = useCallback(
    (fromIndex = 0, { force = false } = {}) => {
      if (!TUTORIAL_CONFIG.ENABLED) {
        return;
      }

      const current = stateRef.current;
      if (!force && current.status === 'running') {
        return;
      }

      const targetIndex = Math.min(
        Math.max(fromIndex, 0),
        SUMMARY_STEP_INDEX,
      );
      const targetStep = TUTORIAL_STEPS[targetIndex];
      ensureNavigationForStep(targetStep);
      setResumeVisible(false);

      applyState(prev => ({
        ...prev,
        status: 'running',
        stepIndex: targetIndex,
        skipped: false,
        completed: false,
        startedAt: Date.now(),
        completedAt: null,
        lastPausedAt: null,
      }));
    },
    [applyState, ensureNavigationForStep],
  );

  const startTutorialIfNeeded = useCallback(() => {
    if (!hydrated || !TUTORIAL_CONFIG.ENABLED) {
      return;
    }

    const current = stateRef.current;
    if (current.status === 'running') {
      return;
    }

    if (TUTORIAL_CONFIG.FORCE_TUTORIAL) {
      startTutorial(0, { force: true });
      return;
    }

    if (!current.completed) {
      startTutorial(0, { force: true });
    }
  }, [hydrated, startTutorial]);

  const goToNext = useCallback(() => {
    applyState(prev => {
      if (prev.stepIndex >= SUMMARY_STEP_INDEX) {
        return {
          ...prev,
          status: 'completed',
          completed: true,
          completedAt: Date.now(),
          lastPausedAt: null,
        };
      }
      const nextIndex = Math.min(prev.stepIndex + 1, SUMMARY_STEP_INDEX);
      return {
        ...prev,
        status: 'running',
        stepIndex: nextIndex,
        lastPausedAt: null,
      };
    });
  }, [applyState]);

  const goToPrevious = useCallback(() => {
    applyState(prev => {
      const previousIndex = Math.max(prev.stepIndex - 1, 0);
      return {
        ...prev,
        status: 'running',
        stepIndex: previousIndex,
        lastPausedAt: null,
      };
    });
  }, [applyState]);

  // "Passer" = vraie sortie : on ferme le tuto là où l'utilisateur est,
  // pas de saut vers le résumé. Marqué completed pour que le tuto ne se
  // relance pas tout seul au prochain démarrage — l'utilisateur peut le
  // rejouer via "revoir le tutoriel".
  // Cas particulier : si c'est le tuto initial (jamais complété auparavant)
  // ET que l'utilisateur passe avant d'avoir atteint la zone Settings, on
  // affiche d'abord la modale de choix des modes de suivi pour qu'il ne
  // reste pas avec les notifs muettes sans le savoir.
  const skipTutorial = useCallback(() => {
    setResumeVisible(false);
    const current = stateRef.current;
    const shouldPromptFollowMode =
      !current.completed && current.stepIndex <= SKIP_PROMPT_MAX_INDEX;
    applyState(prev => ({
      ...prev,
      status: 'completed',
      completed: true,
      completedAt: Date.now(),
      skipped: true,
      lastPausedAt: null,
    }));
    if (shouldPromptFollowMode) {
      setFollowPromptVisible(true);
    }
  }, [applyState]);

  const completeTutorial = useCallback(() => {
    setResumeVisible(false);
    applyState(prev => ({
      ...prev,
      status: 'completed',
      completed: true,
      completedAt: Date.now(),
      lastPausedAt: null,
    }));
  }, [applyState]);

  const restartTutorial = useCallback(() => {
    setResumeVisible(false);
    setFollowPromptVisible(false);
    startTutorial(0, { force: true });
  }, [startTutorial]);

  // Test / dev : remet l'état complet de tutoriel à zéro (comme une
  // première installation) puis lance le step 0. Permet de re-tester la
  // modale "premier passage" du skip.
  const initTutorial = useCallback(() => {
    setResumeVisible(false);
    setFollowPromptVisible(false);
    applyState(() => ({
      ...INITIAL_STATE,
      status: 'running',
      stepIndex: 0,
      startedAt: Date.now(),
    }));
    ensureNavigationForStep(TUTORIAL_STEPS[0]);
  }, [applyState, ensureNavigationForStep]);

  const resumeTutorial = useCallback(() => {
    setResumeVisible(false);
    const current = stateRef.current;
    const step = TUTORIAL_STEPS[current.stepIndex];
    ensureNavigationForStep(step);
    applyState(prev => ({
      ...prev,
      status: 'running',
      lastPausedAt: null,
    }));
  }, [applyState, ensureNavigationForStep]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const current = stateRef.current;

      if (nextState === 'background' || nextState === 'inactive') {
        if (current.status === 'running') {
          applyState(
            prev => ({
              ...prev,
              status: 'paused',
              lastPausedAt: Date.now(),
            }),
            { persist: true },
          );
        }
        return;
      }

      if (nextState === 'active') {
        const latest = stateRef.current;
        if (latest.status === 'paused') {
          const elapsed = latest.lastPausedAt
            ? Date.now() - latest.lastPausedAt
            : 0;
          if (elapsed >= TUTORIAL_CONFIG.INACTIVITY_THRESHOLD_MS) {
            setResumeVisible(true);
          } else {
            resumeTutorial();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [applyState, resumeTutorial]);

  useEffect(() => {
    if (state.status !== 'running') {
      return;
    }
    const step = TUTORIAL_STEPS[state.stepIndex];
    ensureNavigationForStep(step);
  }, [ensureNavigationForStep, state.status, state.stepIndex]);

  const currentStep = state.status === 'running'
    ? TUTORIAL_STEPS[state.stepIndex]
    : null;

  const currentTargets =
    currentStep && Array.isArray(currentStep.targets)
      ? currentStep.targets
          .map(target => ({
            segment: target.segment || null,
            layout: layoutsRef.current[target.id] || null,
          }))
          .filter(target => target.layout)
      : [];

  const contextValue = useMemo(
    () => ({
      state,
      hydrated,
      measureNonce,
      registerTarget,
      unregisterTarget,
      requestMeasure,
      registerNavigationRef,
      startTutorialIfNeeded,
      startTutorial,
      restartTutorial,
      initTutorial,
      skipTutorial,
      completeTutorial,
      goToNext,
      goToPrevious,
    }),
    [
      completeTutorial,
      goToNext,
      goToPrevious,
      hydrated,
      initTutorial,
      measureNonce,
      registerNavigationRef,
      registerTarget,
      requestMeasure,
      restartTutorial,
      skipTutorial,
      startTutorial,
      startTutorialIfNeeded,
      state,
      unregisterTarget,
    ],
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <TutorialOverlay
        visible={state.status === 'running'}
        stepIndex={state.stepIndex}
        targets={currentTargets}
        onNext={state.stepIndex >= SUMMARY_STEP_INDEX ? completeTutorial : goToNext}
        onPrev={goToPrevious}
        onSkip={skipTutorial}
      />
      <TutorialResumeModal
        visible={resumeVisible}
        onRestart={restartTutorial}
        onResume={resumeTutorial}
        onSkip={skipTutorial}
      />
      <FollowModePromptModal
        visible={followPromptVisible}
        onConfirm={() => setFollowPromptVisible(false)}
      />
    </TutorialContext.Provider>
  );
};

export const useTutorialContext = () => {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorialContext must be used within TutorialProvider');
  }
  return ctx;
};

export default TutorialProvider;

