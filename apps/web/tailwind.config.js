/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chat: {
          light: '#efeae2',
          dark: '#0b141a',
          bubbleLight: '#d9fdd3',
          bubbleDark: '#005c4b',
          inputLight: '#ffffff',
          inputDark: '#202c33',
          sidebarLight: '#ffffff',
          sidebarDark: '#111b21',
          headerLight: '#f0f2f5',
          headerDark: '#202c33'
        }
      }
    },
  },
  plugins: [],
};
