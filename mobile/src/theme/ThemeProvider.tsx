import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { storage, StorageKeys } from '@/services/storage';

import { darkColors, lightColors, type ColorPalette } from './colors';
import { radius, spacing } from './spacing';
import { buildTypography, type FontSizeOption } from './typography';

/** Modo de color elegido por el usuario. "system" sigue la configuración del celular. */
export type ThemeMode = 'system' | 'light' | 'dark';

interface Preferences {
  mode: ThemeMode;
  fontSize: FontSizeOption;
}

const defaultPreferences: Preferences = { mode: 'system', fontSize: 'medium' };

export interface AppTheme {
  isDark: boolean;
  mode: ThemeMode;
  fontSize: FontSizeOption;
  colors: ColorPalette;
  typography: ReturnType<typeof buildTypography>;
  spacing: typeof spacing;
  radius: typeof radius;
  /** true cuando ya se cargaron las preferencias guardadas. */
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSizeOption) => void;
}

const ThemeContext = createContext<AppTheme | null>(null);

/**
 * Provee el tema a toda la app. Cambiar el modo o el tamaño de letra acá
 * re-renderiza todas las pantallas con los nuevos valores, y se guarda en el dispositivo.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage.get<Preferences>(StorageKeys.preferences).then((saved) => {
      if (saved) setPrefs({ ...defaultPreferences, ...saved });
      setReady(true);
    });
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      storage.set(StorageKeys.preferences, next);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: ThemeMode) => update({ mode }), [update]);
  const setFontSize = useCallback((fontSize: FontSizeOption) => update({ fontSize }), [update]);

  const isDark = prefs.mode === 'system' ? systemScheme === 'dark' : prefs.mode === 'dark';

  const value = useMemo<AppTheme>(
    () => ({
      isDark,
      mode: prefs.mode,
      fontSize: prefs.fontSize,
      colors: isDark ? darkColors : lightColors,
      typography: buildTypography(prefs.fontSize),
      spacing,
      radius,
      ready,
      setMode,
      setFontSize,
    }),
    [isDark, prefs.mode, prefs.fontSize, ready, setMode, setFontSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook para usar el tema desde cualquier componente. */
export function useAppTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme debe usarse dentro de <AppThemeProvider>');
  return ctx;
}
