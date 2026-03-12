import React, {useMemo} from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {COLORS} from '../constants';
import {SUMMARY_STEP_INDEX, TUTORIAL_STEPS} from './steps';

const {width: WINDOW_WIDTH, height: WINDOW_HEIGHT} = Dimensions.get('window');
const HIGHLIGHT_PADDING = 12;

const TutorialOverlay = ({
  visible,
  stepIndex,
  layout,
  onNext,
  onPrev,
  onSkip,
}) => {
  const {t} = useTranslation();
  const step = TUTORIAL_STEPS[stepIndex];
  const insets = useSafeAreaInsets();

  const highlight = useMemo(() => {
    if (!layout || step?.isSummary) {
      return null;
    }

    const padding = HIGHLIGHT_PADDING;
    const adjusted = {
      x: layout.x - padding,
      y: layout.y + insets.top - padding,
      width: layout.width + padding * 2,
      height: layout.height + padding * 2,
    };

    const clamped = {
      x: Math.max(adjusted.x, 0),
      y: Math.max(adjusted.y, 0),
      width: adjusted.width,
      height: adjusted.height,
    };

    clamped.width = Math.min(clamped.width, WINDOW_WIDTH - clamped.x);
    clamped.height = Math.min(clamped.height, WINDOW_HEIGHT - clamped.y);

    if (clamped.width <= 0 || clamped.height <= 0) {
      return null;
    }

    return clamped;
  }, [layout, step, insets.top]);

  if (!visible || !step) {
    return null;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === SUMMARY_STEP_INDEX;

  const overlays = highlight
    ? buildOverlayStyles(highlight)
    : buildFullOverlayStyles();

  const tooltipPosition = computeTooltipPosition(step, highlight);

  const handleSkip = () => {
    if (isLast) {
      onNext();
      return;
    }
    onSkip();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.container} pointerEvents="auto">
        {overlays.map((overlay, index) => (
          <View key={index} style={[styles.backdrop, overlay]} />
        ))}

        {highlight ? (
          <View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                left: highlight.x,
                top: highlight.y,
                width: highlight.width,
                height: highlight.height,
              },
            ]}
          />
        ) : null}

        <View style={[styles.tooltipContainer, tooltipPosition]}>
          <Text style={styles.stepLabel}>
            {t('tutorial.stepLabel', {
              current: stepIndex + 1,
              total: TUTORIAL_STEPS.length,
            })}
          </Text>
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.description}>{t(step.descriptionKey)}</Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity onPress={handleSkip} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>{t('tutorial.skipButton')}</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
              {!isFirst ? (
                <TouchableOpacity
                  onPress={onPrev}
                  style={[styles.button, styles.secondaryButton]}>
                  <Text style={styles.secondaryButtonLabel}>
                    {t('tutorial.previous')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={onNext}
                style={[styles.button, styles.primaryButton]}>
                <Text style={styles.primaryButtonLabel}>
                  {isLast ? t('tutorial.finish') : t('tutorial.next')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

function buildOverlayStyles(highlight) {
  const bottom = highlight.y + highlight.height;
  const right = highlight.x + highlight.width;

  return [
    {
      left: 0,
      top: 0,
      height: highlight.y,
      width: WINDOW_WIDTH,
    },
    {
      left: 0,
      top: highlight.y,
      width: highlight.x,
      height: highlight.height,
    },
    {
      left: right,
      top: highlight.y,
      width: WINDOW_WIDTH - right,
      height: highlight.height,
    },
    {
      left: 0,
      top: bottom,
      height: WINDOW_HEIGHT - bottom,
      width: WINDOW_WIDTH,
    },
  ];
}

function buildFullOverlayStyles() {
  return [
    {
      left: 0,
      top: 0,
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
    },
  ];
}

function computeTooltipPosition(step, highlight) {
  const position = [];

  if (!highlight) {
    position.push(styles.tooltipAbsolute);
    position.push({
      left: 16,
      right: 16,
      top: Math.max(WINDOW_HEIGHT / 2 - 120, 32),
    });
  } else {
    const tooltipWidth = WINDOW_WIDTH - 32;
    const spaceBelow = WINDOW_HEIGHT - (highlight.y + highlight.height);
    const placeBelow = spaceBelow > 200 || highlight.y < 120;
    const topPosition = placeBelow
      ? highlight.y + highlight.height + 16
      : Math.max(highlight.y - 180, 24);

    position.push(styles.tooltipAbsolute);
    position.push({
      width: tooltipWidth,
      left: 16,
      top: topPosition,
    });
  }

  const offset = step?.tooltipOffset;
  if (offset && position[1]) {
    if (typeof offset.x === 'number') {
      if (position[1].left !== undefined) {
        position[1].left += offset.x;
      }
      if (position[1].right !== undefined) {
        position[1].right -= offset.x;
      }
    }
    if (typeof offset.y === 'number') {
      position[1].top = Math.max((position[1].top ?? 0) + offset.y, 16);
    }
  }

  return position;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(3, 8, 15, 0.56)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.STEAM_BLUE,
  },
  tooltipContainer: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 12,
    elevation: 12,
  },
  tooltipAbsolute: {
    position: 'absolute',
  },
  stepLabel: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  textButtonLabel: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.STEAM_BLUE,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    marginRight: 12,
  },
  primaryButtonLabel: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  secondaryButtonLabel: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontWeight: '500',
  },
});

export default TutorialOverlay;
