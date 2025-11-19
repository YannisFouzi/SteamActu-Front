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
import TutorialOverlay from './TutorialOverlay';
import TutorialResumeModal from './TutorialResumeModal';
import { SUMMARY_STEP_INDEX, TUTORIAL_STEPS } from './steps';
import { TUTORIAL_CONFIG } from '../config/tutorial';

const STORAGE_KEY = '@steam-actu/tutorial-status';

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
  const [layoutVersion, setLayoutVersion] = useState(0);

  const [resumeVisible, setResumeVisible] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(async nextState => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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

  const goToStep = useCallback(
    targetIndex => {
      const clamped = Math.min(
        Math.max(targetIndex, 0),
        SUMMARY_STEP_INDEX,
      );
      const targetStep = TUTORIAL_STEPS[clamped];
      ensureNavigationForStep(targetStep);

      applyState(prev => ({
        ...prev,
        status: 'running',
        stepIndex: clamped,
        lastPausedAt: null,
      }));
    },
    [applyState, ensureNavigationForStep],
  );

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
      const step = TUTORIAL_STEPS[nextIndex];
      ensureNavigationForStep(step);
      return {
        ...prev,
        status: 'running',
        stepIndex: nextIndex,
        lastPausedAt: null,
      };
    });
  }, [applyState, ensureNavigationForStep]);

  const goToPrevious = useCallback(() => {
    applyState(prev => {
      const previousIndex = Math.max(prev.stepIndex - 1, 0);
      const step = TUTORIAL_STEPS[previousIndex];
      ensureNavigationForStep(step);
      return {
        ...prev,
        status: 'running',
        stepIndex: previousIndex,
        lastPausedAt: null,
      };
    });
  }, [applyState, ensureNavigationForStep]);

  const skipTutorial = useCallback(() => {
    setResumeVisible(false);
    const summaryStep = TUTORIAL_STEPS[SUMMARY_STEP_INDEX];
    ensureNavigationForStep(summaryStep);
    applyState(prev => ({
      ...prev,
      status: 'running',
      stepIndex: SUMMARY_STEP_INDEX,
      skipped: true,
      lastPausedAt: null,
    }));
  }, [applyState, ensureNavigationForStep]);

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
    startTutorial(0, { force: true });
  }, [startTutorial]);

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

  const currentLayout = useMemo(() => {
    if (!currentStep || !currentStep.targetId) {
      return null;
    }
    return layoutsRef.current[currentStep.targetId] || null;
  }, [currentStep, layoutVersion]);

  const contextValue = useMemo(
    () => ({
      state,
      hydrated,
      registerTarget,
      unregisterTarget,
      registerNavigationRef,
      startTutorialIfNeeded,
      startTutorial,
      restartTutorial,
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
      registerNavigationRef,
      registerTarget,
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
        layout={currentLayout}
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

