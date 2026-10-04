// components/MobilePremium/showcase/styles.ts
// The showcase's shared StyleSheet — page scaffolding (shell / section /
// spacer), per-demo styles, and section rows. Demos import `styles` from
// here; index.tsx composes the page.
import { StyleSheet } from 'react-native';
import { theme } from '../../../constants';
import { ABSORB_DEMO_BAR_H } from './data';

export const styles = StyleSheet.create({
  bareCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  bareCheckboxLabel: {
    fontSize: 13,
  },
  shell: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  pageHeaderDemo: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 5,
  },
  axisLabel: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 132,
  },
  axisValue: {
    fontSize: 12.5,
    flex: 1,
  },
  axisHint: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  axisToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  axisToggleControl: {
    flex: 1,
    minWidth: 0,
  },
  absorbDemo: {
    position: 'relative',
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
  },
  absorbScroll: {
    flex: 1,
  },
  absorbContent: {
    padding: 16,
    gap: 12,
  },
  absorbCard: {
    borderRadius: 12,
    padding: 18,
    minHeight: 96,
    justifyContent: 'center',
  },
  absorbCardText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  absorbChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absorbChromeTitle: {
    position: 'absolute',
    fontSize: 15,
    fontWeight: '700',
  },
  // The contrast copies' clip windows — engine-written height, anchored
  // to the strip's floor while entering and its top while exiting; the
  // content stays pinned to the strip's edge so only the window moves.
  absorbClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
    overflow: 'hidden',
  },
  absorbClipExit: {
    top: 0,
    bottom: 'auto',
  },
  absorbClipContentEnter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: ABSORB_DEMO_BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absorbClipContentExit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ABSORB_DEMO_BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absorbTail: {
    height: 120,
  },
  spacer: {
    height: 12,
  },
  skeletonAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatarMeta: {
    flex: 1,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  atmosphereRow: {
    marginBottom: 12,
    borderRadius: theme.shapes.surface,
    overflow: 'hidden',
  },
  atmosphereContainer: {
    height: 120,
    position: 'relative',
    borderRadius: theme.shapes.surface,
    overflow: 'hidden',
  },
  atmosphereLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.shapes.tag,
    borderWidth: 1,
  },
  themeChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toastRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toastChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.shapes.tag,
    borderWidth: 1,
  },
  toastChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  animGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animCard: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: theme.shapes.tile,
  },
  animLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  animValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counterButton: {
    width: 'auto',
    alignSelf: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  shakeCard: {
    padding: 12,
    borderRadius: theme.shapes.tile,
  },
  variantRow: {
    marginBottom: 12,
  },
  variantProbe: {
    borderRadius: 8,
  },
  variantMeta: {
    marginTop: 6,
  },
  tabPanel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.tile,
  },
  disclosureHeader: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  figureGap: { width: 8 },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statRowCell: {
    flex: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  tutorialSlide: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 12,
  },
  ringCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  ringLabelLg: {
    fontSize: 20,
    fontWeight: '700',
  },
  revealWrap: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.tile,
  },
  revealText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
