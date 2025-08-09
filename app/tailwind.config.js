/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./{app,components}/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary:{
          DEFAULT: require('tailwindcss/colors').emerald[500],
          light: require('tailwindcss/colors').emerald[400],
          dark: require('tailwindcss/colors').emerald[600],
        }
      },
    },
  },
  plugins: [],
}