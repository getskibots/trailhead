import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Alpine-neutral admin chrome — internal tool, not brand-facing.
        ink: "#0f172a",
        slate: {
          850: "#172033",
        },
        glacier: "#0ea5e9",
        summit: "#14b8a6",
      },
    },
  },
  plugins: [],
};

export default config;
