import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'typing-dot-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-0.25rem)' },
        },
      },
      animation: {
        'typing-dot-bounce': 'typing-dot-bounce 1.4s infinite ease-in-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;


