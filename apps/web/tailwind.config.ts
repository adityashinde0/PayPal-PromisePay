import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0070BA",
          darkblue: "#003087",
          cyan: "#00CFDE",
          accent: "#2563EB",
        },
      },
    },
  },
  plugins: [],
};
export default config;

