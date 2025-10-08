/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // tailwind.config.js (chỉ phần extend)
extend: {
  colors: {
    brand: {
      dark: "#1C2135",
      primary: "#5A6794",
      secondary: "#8794C0",
      light: "#E7E9EE",
      accent: "#D8CDB0",
      // mới thêm
      muted: "#F4F5F8",      // nền phụ rất nhạt
      ring: "#A8B1D6",       // màu viền focus/hover
    },
  },
  boxShadow: {
    smooth: "0 10px 30px rgba(28,33,53,0.10)",
  },
  borderRadius: {
    "2xl": "1rem",
  },
}

  },
  plugins: [],
};
