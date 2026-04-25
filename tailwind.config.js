module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./components/**/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["neue-haas-unica, sans-serif", "ui-sans-serif", "system-ui"],
        mono: ["Geist Mono", "monospace"],
        serif: ['var(--font-cormorant)', '"Cormorant Garamond"', 'serif'],
        serif2: ["Muse"],
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        light: 300,
        thin: 100,
        extrabold: 800,
        black: 900,
      },
      fontSize: {
        base: "19.5px",
      },
      colors: {
        desk: "#e8e2d9",
        panel: "#f4efe8",
        "panel-hover": "#ede8e0",
        popover: "#f0ebe3",
        card: "#f9f6f1",
        parchment: "#f4efe8",
        "parchment-light": "#f9f6f1",
        "sidebar-inset": "#ede8e0",
        surface: "#f9f6f1",
        "surface-hover": "#ede8e0",
        "surface-active": "#e8e2d9",
        console: "#2c2416",
        sepia: {
          50:  "#faf7f2",
          100: "#f4efe8",
          200: "#ede8e0",
          300: "#e0d8cc",
          400: "#cfc4b2",
          500: "#b8a98e",
          600: "#a08a68",
          700: "#8b6f47",
          800: "#6e5234",
          900: "#4a3520",
        },
        purple: {
          100: "#F6F8FF",
          200: "#F2F4FB",
          300: "#E9ECFF",
          400: "#DEE2F9",
          500: "#CCD2F2",
          600: "#ABB4E3",
          700: "#7F8AC7",
          800: "#636EAB",
          900: "#434D80",
        },
        pink: {
          100: "#FFF7FD",
          200: "#FAF2F8",
          300: "#FFE8F8",
          400: "#FADEF2",
          500: "#F2CBE7",
          600: "#E3AAD3",
          700: "#C77FB3",
          800: "#AB6397",
          900: "#80446F",
        },
        blue: {
          100: "#F6FCFF",
          200: "#F2F8FA",
          300: "#E8F8FF",
          400: "#DEF1FA",
          500: "#CCE7F3",
          600: "#AAD1E3",
          700: "#7FB0C7",
          800: "#6394AB",
          900: "#446D80",
        },
        green: {
          100: "#F7FFFC",
          200: "#F2FAF7",
          300: "#E8FFF5",
          400: "#DEFAEE",
          500: "#CBF2E1",
          600: "#AAE3CA",
          700: "#7FC7A8",
          800: "#63AB8C",
          900: "#448066",
        },
      },
      boxShadow: {
        pane: "0 0 0 1px rgba(100,75,40,0.10), 0 2px 6px rgba(60,40,15,0.08), 0 8px 24px rgba(40,25,8,0.10)",
        card: "0 0 0 1px rgba(100,75,40,0.08), 0 1px 3px rgba(60,40,15,0.06)",
        "card-sm": "0 0 0 1px rgba(100,75,40,0.06)",
        popup: "0 0 0 1px rgba(100,75,40,0.12), 0 4px 16px rgba(60,40,15,0.14), 0 16px 40px rgba(40,25,8,0.12)",
      },
      borderRadius: {
        pane: "12px",
      },
      maxWidth: {
        "8xl": "88rem",
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateX(0deg)" },
          "50%": { transform: "rotateX(180deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
      },
      animation: {
        flip: "flip 1.2s ease-in-out",
        "flip-up": "flipUp 1s ease-out forwards",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities(
        {
          ".scrollbar-hidden": {
            "scrollbar-width": "none",
            "-ms-overflow-style": "none",
          },
          ".scrollbar-hidden::-webkit-scrollbar": {
            display: "none",
          },
        },
        ["responsive", "hover"]
      );
    },
  ],
};
