// components/composed/AppShellHeader.tsx
// The home header wired to the cutout nav drawer — the shell's one-drawer
// pattern pre-assembled: MobileHomeHeader (brand from APP_DISPLAY_NAME,
// the shell's display-name slot) + HamburgerButton + MobileNavDrawer in
// the APP_LAYOUT default persistence/anchor modes, locked to the shared
// content column. Consumers pass their drawer destinations — typically
// navigateTo* helpers from the navigation barrel — plus the optional
// slots MobileHomeHeader and MobileNavDrawer already expose (subtitle,
// rightAction, footer, atmosphere). One app, one drawer: child screens
// carry the `> [title]` MobileHeader and go back with the chevron; this
// header belongs to the home surface only.
//
// Dialect-aware by construction: the surface chrome follows
// theme.drawer.style. Under 'glass' (the starter default) the drawer is
// the scrim sheet — the glass cap layers under the masthead. Under
// 'ink' the plate runs the panel's full height UNDER the masthead:
// MobileHomeHeader rides it (onPlate — type bleeds to paper as the
// plate sweeps under, subtitle + right chrome going invisible while
// open), the hamburger flips to the background color so the close X
// reads on the plate, the glass cap stays retired, and the
// destinations render as ledger rows (uppercase, mono-faced when a
// mono font is declared). Icon colors stay consumer-owned either way —
// under ink, pass paper-colored icons (the theme's background color)
// in `items`, since they sit on the ink plate.

import React, { useState } from 'react';
import { usePathname } from 'expo-router';
import {
  HamburgerButton,
  MobileHomeHeader,
  MobileNavDrawer,
  MobileNavDrawerGlassCap,
  type MobileNavDrawerItem,
} from '../MobilePremium';
import {
  APP_DISPLAY_NAME,
  APP_LAYOUT,
  MOBILE_CONTENT_MAX_WIDTH,
  theme,
} from '../../constants';
import { useAppTheme } from '../../context';

/** Atmosphere surface for the drawer body — the drawer's own prop type. */
type DrawerAtmosphere = React.ComponentProps<typeof MobileNavDrawer>['atmosphere'];

interface AppShellHeaderProps {
  /** Drawer destinations — navigateTo* helpers from the navigation barrel. */
  items: MobileNavDrawerItem[];
  /** Optional normal-case subtitle under the brand (screen context). */
  subtitle?: string;
  /** Optional top-right action — rides MobileHomeHeader's rightAction slot. */
  rightAction?: React.ReactNode;
  /** Optional drawer bottom slot (sign-out, etc.). */
  footer?: React.ReactNode;
  /** Atmosphere surface for the drawer body (the drawer default applies when omitted). */
  atmosphere?: DrawerAtmosphere;
}

/** The ink dialect's ledger treatment for drawer destination labels. */
const INK_ITEM_LABEL_STYLE = {
  fontFamily: theme.fonts.mono,
  fontSize: 12,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
} as const;

export function AppShellHeader({
  items,
  subtitle,
  rightAction,
  footer,
  atmosphere,
}: AppShellHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { colors } = useAppTheme();
  const ink = theme.drawer.style === 'ink';
  // Boolean-typed before JSX so the no-leaked-render rule sees a bool,
  // not a potentially-leaky && expression.
  const mastheadOnPlate = Boolean(drawerOpen && ink);
  // The cap is glass-dialect chrome; under ink the plate replaces it.
  const glassCap = ink ? null : (
    <MobileNavDrawerGlassCap
      open={drawerOpen}
      columnWidth={MOBILE_CONTENT_MAX_WIDTH}
      testID="app-shell-glass-cap"
    />
  );

  return (
    <>
      <MobileHomeHeader
        brand={APP_DISPLAY_NAME}
        subtitle={subtitle}
        rightAction={rightAction}
        onPlate={mastheadOnPlate}
        menuButton={
          <HamburgerButton
            isOpen={drawerOpen}
            onPress={() => setDrawerOpen((prev) => !prev)}
            color={mastheadOnPlate ? colors.background : undefined}
          />
        }
        drawerGlassCap={glassCap ?? undefined}
      />
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        activePathname={pathname ?? '/'}
        atmosphere={atmosphere}
        footer={footer}
        anchor={APP_LAYOUT.navDrawerAnchor}
        brandPersistence={APP_LAYOUT.navDrawerBrandPersistence}
        columnWidth={MOBILE_CONTENT_MAX_WIDTH}
        itemLabelStyle={ink ? INK_ITEM_LABEL_STYLE : undefined}
      />
    </>
  );
}

export default AppShellHeader;
