import { createTheme } from "@mui/material";
import { createContext, useState } from "react";

const CustomThemeContext = createContext(undefined);

const CustomThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode((prevState) => !prevState);
  };

  const handleLightMode = () => {
    setDarkMode(false);
  };

  const themeDark = createTheme({
    palette: {
      mode: "dark",
    },
  });

  const themeLight = createTheme({
    palette: {
      mode: "light",
    },
    background: {
      default: "#fafafa", // Custom light background color
    },
  });

  return (
    <CustomThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        handleLightMode,
        themeDark,
        themeLight,
      }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
};

export { CustomThemeContext, CustomThemeProvider };
