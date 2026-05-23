import React, { useEffect, useRef, useCallback } from 'react';
import { View } from 'react-native';
import { useTutorial } from './useTutorial';

const TutorialTarget = ({ id, style, children, pointerEvents }) => {
  const { registerTarget, unregisterTarget, measureNonce } = useTutorial();
  const viewRef = useRef(null);
  const measureAttemptsRef = useRef(0);

  const measure = useCallback(() => {
    if (!id || !viewRef.current) {
      return;
    }

    try {
      viewRef.current.measureInWindow((x, y, width, height) => {
        if (width && height) {
          registerTarget(id, { x, y, width, height });
        } else {
          // Retry si les dimensions sont invalides
          if (measureAttemptsRef.current < 3) {
            measureAttemptsRef.current += 1;
            setTimeout(measure, 100 * measureAttemptsRef.current);
          }
        }
      });
    } catch (error) {
      // ignore measure errors
    }
  }, [id, registerTarget]);

  useEffect(() => {
    // Reset counter
    measureAttemptsRef.current = 0;

    // Mesure différée pour attendre la stabilisation du layout
    // On utilise requestAnimationFrame + setTimeout pour s'assurer que
    // tous les layouts parents (SafeAreaView, ScrollView, etc.) sont stabilisés
    const rafId = requestAnimationFrame(() => {
      const timeout = setTimeout(() => {
        measure();
        // Deuxième tentative après 100ms pour les cas où le layout prend plus de temps
        setTimeout(measure, 100);
      }, 50);

      return () => clearTimeout(timeout);
    });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [measure, children, measureNonce]);

  useEffect(() => {
    return () => {
      if (id) {
        unregisterTarget(id);
      }
    };
  }, [id, unregisterTarget]);

  return (
    <View
      collapsable={false}
      pointerEvents={pointerEvents ?? 'box-none'}
      style={style}
      ref={viewRef}
      onLayout={measure}>
      {children}
    </View>
  );
};

export default TutorialTarget;

