/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        ink: { DEFAULT: token("ink"), fg: token("ink-fg") },
        border: { DEFAULT: token("border"), strong: token("border-strong") },
        fg: { DEFAULT: token("fg"), muted: token("fg-muted"), subtle: token("fg-subtle") },
        primary: {
          DEFAULT: token("primary"),
          pressed: token("primary-pressed"),
          fg: token("primary-fg"),
          text: token("primary-text"),
          soft: token("primary-soft"),
        },
        accent: { DEFAULT: token("accent"), soft: token("accent-soft") },
        flame: { DEFAULT: token("flame"), soft: token("flame-soft") },
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        info: token("info"),
        overlay: token("overlay"),
        orange: {
          50: "#FFF5E6", 100: "#FFE7C2", 200: "#FFCF85", 300: "#FFB347", 400: "#FF9A1A",
          500: "#FD8401", 600: "#E06E00", 700: "#B85600", 800: "#8F4300", 900: "#6B3200", 950: "#3D1C00",
        },
        yellow: {
          50: "#FFFBE6", 100: "#FFF5BF", 200: "#FFEC80", 300: "#FFE54D", 400: "#FFE133",
          500: "#FFDE21", 600: "#E6C200", 700: "#B39700", 800: "#806C00", 900: "#594B00",
        },
        red: {
          50: "#FFF0F0", 100: "#FFD6D6", 200: "#FFA8A8", 300: "#FF6B6B", 400: "#FF3838",
          500: "#FF0000", 600: "#E00000", 700: "#B30000", 800: "#800000", 900: "#4D0000",
        },
        neutral: {
          0: "#FFFFFF", 50: "#F6F6F8", 100: "#EBEBEF", 200: "#D6D6DD", 300: "#B4B4BE", 400: "#8A8A96",
          500: "#5B5B66", 600: "#3A3A43", 700: "#26262D", 800: "#1C1C21", 850: "#16161A", 900: "#111114", 950: "#0B0B0D",
        },
      },
      fontFamily: {
        // RN não sintetiza peso: cada peso é uma família carregada via expo-font
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        display: ["Saira_700Bold"],
        "display-semibold": ["Saira_600SemiBold"],
        "display-black": ["Saira_800ExtraBold_Italic"],
        eyebrow: ["SairaCondensed_600SemiBold"],
        mono: ["JetBrainsMono_500Medium"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }] em pt; letterSpacing absoluto (RN não aceita em)
        "display-xl": ["40px", { lineHeight: "42px", letterSpacing: "-0.8px" }],
        "display-lg": ["32px", { lineHeight: "36px", letterSpacing: "-0.6px" }],
        "display-md": ["26px", { lineHeight: "30px", letterSpacing: "-0.3px" }],
        h1: ["24px", { lineHeight: "30px", letterSpacing: "-0.2px" }],
        h2: ["20px", { lineHeight: "26px" }],
        h3: ["17px", { lineHeight: "23px" }],
        "body-lg": ["17px", { lineHeight: "26px" }],
        body: ["15px", { lineHeight: "22px" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.1px" }],
        eyebrow: ["11px", { lineHeight: "14px", letterSpacing: "1.5px" }],
        tab: ["11px", { lineHeight: "13px", letterSpacing: "0.2px" }],
      },
      spacing: { 4.5: "18px", 11: "44px", 13: "52px", 15: "60px", 18: "72px", 22: "88px" },
      borderRadius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "16px", "2xl": "20px" },
      aspectRatio: { card: "4 / 3", hero: "16 / 10", gallery: "4 / 3" },
    },
  },
  plugins: [],
};
