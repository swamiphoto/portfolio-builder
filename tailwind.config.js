module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./components/**/**/*.{js,ts,jsx,tsx}", // This ensures deeper folders inside components are included
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["neue-haas-unica, sans-serif", "ui-sans-serif", "system-ui"],
        mono: ["Geist Mono", "monospace"],
        serif: ['"Cormorant Garamond", serif'],
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
      colors: {
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
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities(
        {
          ".scrollbar-hidden": {
            "scrollbar-width": "none" /* Firefox */,
            "-ms-overflow-style": "none" /* IE 10+ */,
          },
          ".scrollbar-hidden::-webkit-scrollbar": {
            display: "none" /* Safari and Chrome */,
          },
        },
        ["responsive", "hover"]
      );
    },
  ],
};
