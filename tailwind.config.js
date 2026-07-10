/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 24px 70px -34px rgba(0, 0, 0, 0.85)',
        'glow-teal': '0 0 28px -6px rgba(45, 212, 191, 0.5)',
        'glow-violet': '0 0 30px -4px rgba(139, 92, 246, 0.55)'
      }
    }
  },
  plugins: []
};
