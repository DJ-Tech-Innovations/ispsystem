import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'ispsystem.theme';
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: 'light', setTheme: () => undefined });

const read = (): Theme => {
    try {
        return (localStorage.getItem(KEY) as Theme) || 'light';
    } catch {
        return 'light';
    }
};

/** The admin app follows the chosen theme. The website and customer portal are always light. */
const THEMED = /^\/(admin|login|forgot-password|reset-password)/;

export const apply = (theme: Theme = read()) => {
    const dark = THEMED.test(location.pathname) && (theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches));
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('site-theme', !location.pathname.startsWith('/admin'));
};

/** Light, dark or follow-the-device. The inline script in app.blade.php applies it before first paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, set] = useState<Theme>(read);

    useEffect(() => {
        apply(theme);
        const query = matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => theme === 'system' && apply(theme);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, [theme]);

    const setTheme = useCallback((next: Theme) => {
        set(next);
        try {
            localStorage.setItem(KEY, next);
        } catch {
            // blocked storage: the choice just lasts until the page reloads
        }
    }, []);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
