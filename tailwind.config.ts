import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * The palette families the app uses. Their shades are driven by CSS variables (--c-<family>-<shade>) so that dark mode
 * can swap them in one place: light tints (50-300) become deep tones and dark text shades (700-950) become light ones,
 * while the mid shades used for icons and solid buttons stay put. Anything inside `.keep-light` (printed documents,
 * the always-dark sidebar) keeps the light values.
 */
const FAMILIES = ["slate", "red", "orange", "amber", "yellow", "green", "emerald", "teal", "cyan", "blue", "indigo", "violet", "purple", "rose"] as const;
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Neutrals mirror the whole scale; coloured families only swap their light tints and dark text shades. */
const DARK_SOURCE: Record<string, Record<number, number>> = {
  slate: { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 500: 500, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50 },
  _: { 50: 950, 100: 900, 200: 800, 300: 700, 400: 400, 500: 500, 600: 600, 700: 300, 800: 200, 900: 100, 950: 50 },
};

const channels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const palette = (dark: boolean) =>
  Object.fromEntries(
    FAMILIES.flatMap((family) =>
      SHADES.map((shade) => {
        const source = dark ? (DARK_SOURCE[family] ?? DARK_SOURCE._)[shade] : shade;
        return [`--c-${family}-${shade}`, channels((colors as unknown as Record<string, Record<number, string>>)[family][source])];
      }),
    ),
  );

const familyColors = Object.fromEntries(
  FAMILIES.map((family) => [family, Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--c-${family}-${shade}) / <alpha-value>)`]))]),
);

export default {
  darkMode: ["class"],
  content: ["./resources/views/**/*.blade.php", "./resources/js/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        ...familyColors,
        // Sampled from the client's logo. 900 is the logo navy, 500 the logo orange.
        royal: { 50: "#EEF1FF", 100: "#DFE5FF", 200: "#C3CDFB", 300: "#9AA9F5", 400: "#6A7FEB", 500: "#3F5BDD", 600: "#1B3FB8", 700: "#16329A", 800: "#13277D", 900: "#10166F", 950: "#0A0F4D" },
        ember: { 50: "#FEF1EA", 100: "#FDE0D0", 200: "#FBC3A3", 300: "#F7A070", 400: "#F27F4A", 500: "#E76131", 600: "#C9460C", 700: "#A83A0B", 800: "#872F0B", 900: "#6E290D", 950: "#3B1205" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(({ addBase }) => {
      addBase({
        ":root": { ...palette(false), colorScheme: "light" },
        ".dark": { ...palette(true), colorScheme: "dark" },
        // Paper-like surfaces (printed documents, previews) and the always-dark sidebar keep the light palette in dark mode.
        ".keep-light, .print-doc": { ...palette(false), colorScheme: "light" },
      });
    }),
  ],
} satisfies Config;
