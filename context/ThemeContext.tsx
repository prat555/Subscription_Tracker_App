import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { darkColors, lightColors } from "../constants/Colors";

type ColorScheme = typeof lightColors;

type ThemeContextType = {
  isDark: boolean;
  colors: ColorScheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("theme").then((theme) => {
      if (theme === "dark") setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
