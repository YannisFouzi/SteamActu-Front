import React, {useMemo} from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Defs, Mask, Rect} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {COLORS} from '../constants';
import {SUMMARY_STEP_INDEX, TUTORIAL_STEPS} from './steps';

const {width: WINDOW_WIDTH, height: WINDOW_HEIGHT} = Dimensions.get('window');
const HIGHLIGHT_PADDING = 12;
const HIGHLIGHT_RADIUS = 12;
const BACKDROP_COLOR = '#03080F';
const BACKDROP_OPACITY = 0.56;
const MASK_ID = 'tutorialCutoutMask';

const TutorialOverlay = ({visible, stepIndex, targets, onNext, onPrev, onSkip}) => {
  const {t} = useTranslation();
  const step = TUTORIAL_STEPS[stepIndex];
  const insets = useSafeAreaInsets();

  // Un step peut viser plusieurs éléments (ex. l'onglet de page + l'onglet
  // de catégorie). On résout chaque cible en un rectangle écran qui sera
  // découpé dans le voile sombre via un masque SVG.
  const highlights = useMemo(() => {
    if (!Array.isArray(targets)) {
      return [];
    }
    return targets
      .map(target => resolveHighlight(target, insets.top))
      .filter(Boolean);
  }, [targets, insets.top]);

  if (!visible || !step) {
    return null;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === SUMMARY_STEP_INDEX;

  const tooltipPosition = computeTooltipPosition(step, highlights);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.container} pointerEvents="auto">
        {/* Voile sombre plein écran percé d'un trou arrondi par cible
            (zéro highlight = masque blanc partout = voile plein). */}
        <Svg
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id={MASK_ID}>
              <Rect
                x={0}
                y={0}
                width={WINDOW_WIDTH}
                height={WINDOW_HEIGHT}
                fill="white"
              />
              {highlights.map((highlight, index) => (
                <Rect
                  key={`hole-${index}`}
                  x={highlight.x}
                  y={highlight.y}
                  width={highlight.width}
                  height={highlight.height}
                  rx={HIGHLIGHT_RADIUS}
                  ry={HIGHLIGHT_RADIUS}
                  fill="black"
                />
              ))}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={WINDOW_WIDTH}
            height={WINDOW_HEIGHT}
            fill={BACKDROP_COLOR}
            fillOpacity={BACKDROP_OPACITY}
            mask={`url(#${MASK_ID})`}
          />
        </Svg>

        {highlights.map((highlight, index) => (
          <View
            key={`highlight-${index}`}
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
        ))}

        <View style={[styles.tooltipContainer, tooltipPosition]}>
          <Text style={styles.stepLabel}>
            {t('tutorial.stepLabel', {
              current: stepIndex + 1,
              total: TUTORIAL_STEPS.length,
            })}
          </Text>
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.description}>{t(step.descriptionKey)}</Text>

          <View
            style={[
              styles.buttonsRow,
              isLast && styles.buttonsRowRightOnly,
            ]}>
            {!isLast ? (
              <TouchableOpacity onPress={onSkip} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>
                  {t('tutorial.skipButton')}
                </Text>
              </TouchableOpacity>
            ) : null}

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

// Convertit une cible {layout, segment} en rectangle écran encadrable.
// `segment` découpe la largeur de l'élément mesuré (barre d'onglets) en
// `count` parts égales et n'en garde que celle d'index `index`.
function resolveHighlight(target, insetTop) {
  if (!target || !target.layout) {
    return null;
  }

  let base = target.layout;
  const segment = target.segment;
  if (segment && segment.count > 0) {
    const segmentWidth = base.width / segment.count;
    base = {
      x: base.x + segmentWidth * segment.index,
      y: base.y,
      width: segmentWidth,
      height: base.height,
    };
  }

  const padding = HIGHLIGHT_PADDING;
  const adjusted = {
    x: base.x - padding,
    y: base.y + insetTop - padding,
    width: base.width + padding * 2,
    height: base.height + padding * 2,
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
}

// Règle de placement :
//  - Steps "Settings" hors résumé (notifications / library / wishlist) :
//    la cible est dans une ScrollView, on positionne l'infobulle juste
//    au-dessus ou en dessous pour suivre la cible.
//  - Tous les autres steps (home-* et résumé) : centre vertical fixe,
//    indépendant des highlights → position stable d'une étape à l'autre.
function computeTooltipPosition(step, highlights) {
  const position = [styles.tooltipAbsolute];
  const useTargetRelative =
    step.screen === 'Settings' && !step.isSummary && highlights.length === 1;

  if (useTargetRelative) {
    const highlight = highlights[0];
    const spaceBelow = WINDOW_HEIGHT - (highlight.y + highlight.height);
    const placeBelow = spaceBelow > 200 || highlight.y < 120;
    const top = placeBelow
      ? highlight.y + highlight.height + 16
      : Math.max(highlight.y - 180, 24);
    position.push({width: WINDOW_WIDTH - 32, left: 16, top});
    return position;
  }

  position.push({
    left: 16,
    right: 16,
    top: Math.max(WINDOW_HEIGHT / 2 - 120, 32),
  });
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
  highlight: {
    position: 'absolute',
    borderRadius: HIGHLIGHT_RADIUS,
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
  buttonsRowRightOnly: {
    justifyContent: 'flex-end',
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
