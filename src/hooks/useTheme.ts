import { useState, useEffect, useCallback } from 'react';

/**
 * 主题类型:light / dark / system
 */
type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'desktop-calendar-theme';

/**
 * 读取已保存的主题偏好,默认 system
 */
function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage 不可用时静默回退
  }
  return 'system';
}

/**
 * 根据主题偏好和系统设置,计算实际是否为暗色
 */
function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // system: 跟随 prefers-color-scheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 将 dark class 应用到 <html> 元素
 */
function applyDarkClass(isDark: boolean): void {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * 主题管理 hook
 *
 * - 默认跟随系统 prefers-color-scheme
 * - 支持手动切换 light / dark / system
 * - 选择持久化到 localStorage
 * - system 模式下监听系统主题变化,实时切换
 *
 * @returns theme 当前主题偏好, isDark 实际是否暗色, setTheme 切换主题
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(getStoredTheme()));

  // 应用 dark class 并持久化
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage 不可用时静默
    }
    const dark = resolveIsDark(next);
    setIsDark(dark);
    applyDarkClass(dark);
  }, []);

  // 初始化:应用当前主题到 DOM
  useEffect(() => {
    const dark = resolveIsDark(theme);
    setIsDark(dark);
    applyDarkClass(dark);
  }, [theme]);

  // system 模式下监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      applyDarkClass(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme, isDark, setTheme };
}
