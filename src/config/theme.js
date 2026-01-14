// src/config/theme.js
export const tier0Theme = {
    colors: {
      // Primary Brand Color (Tier0 Green)
      primary: {
        DEFAULT: '#a3e635',    // Main green
        hover: '#84cc16',      // Darker green on hover
        light: '#d9f99d',      // Light green for backgrounds
        dark: '#65a30d',       // Dark green
      },
      
      // Dark Theme (for special sections)
      dark: {
        DEFAULT: '#020617',    // Deep dark blue-black
        light: '#0f172a',      // Slightly lighter
      },
      
      // Neutral Colors
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1e293b',   // Dark slate
        secondary: '#64748b',  // Medium slate
        muted: '#94a3b8',      // Light slate
      },
      
      // Border Colors
      border: {
        DEFAULT: '#e2e8f0',
        light: '#f1f5f9',
      },
    },
    
    // Button Styles
    button: {
      borderRadius: '0.5rem',  // rounded-lg
    },
  }