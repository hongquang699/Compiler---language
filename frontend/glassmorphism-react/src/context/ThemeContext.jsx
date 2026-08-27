import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('aurora'); // 'aurora' | 'cyber' | 'deepsea'
  const [blurIntensity, setBlurIntensity] = useState(20);
  const [glassOpacity, setGlassOpacity] = useState(12);

  const themeGradients = {
    aurora: {
      name: 'Aurora Violet',
      orb1: 'from-indigo-600/50 to-purple-600/40',
      orb2: 'from-cyan-500/40 to-blue-600/30',
      orb3: 'from-pink-500/40 to-rose-600/30',
      accent: 'indigo',
    },
    cyber: {
      name: 'Cyber Rose',
      orb1: 'from-fuchsia-600/50 to-pink-600/40',
      orb2: 'from-amber-500/40 to-rose-600/30',
      orb3: 'from-violet-600/40 to-cyan-500/30',
      accent: 'rose',
    },
    deepsea: {
      name: 'Deep Sea Emerald',
      orb1: 'from-teal-500/50 to-emerald-600/40',
      orb2: 'from-cyan-600/40 to-blue-700/30',
      orb3: 'from-indigo-600/40 to-sky-500/30',
      accent: 'cyan',
    },
  };

  const currentTheme = themeGradients[themeMode] || themeGradients.aurora;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        blurIntensity,
        setBlurIntensity,
        glassOpacity,
        setGlassOpacity,
        currentTheme,
        themeGradients,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
