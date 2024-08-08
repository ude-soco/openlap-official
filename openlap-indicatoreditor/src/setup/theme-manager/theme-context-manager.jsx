import { createTheme } from "@mui/material";
import { orange, blue } from "@mui/material/colors";
import { createContext, useState } from "react";

const CustomThemeContext = createContext();

const main = blue[700];
const main2 = orange[500];

const CustomThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode((prevState) => !prevState);
  };

  const themeDark = createTheme({
    palette: {
      mode: "dark",
      openlapTheme: {
        white: "#FFFFFF",
        light: "#3E3E3E",
        main: "#272727",
        contrast: "#FFFFFF",
        dark: "#121212",
        secondary: main2,
        secondary2: main,
      },
    },
  });

  const themeLight = createTheme({
    palette: {
      mode: "light",
      openlapTheme: {
        light: "#FFFFFF",
        main: "#F7F7F7",
        contrast: "#3f3f3f",
        dark: "#121212",
        secondary: main,
        secondary2: main2,
      },
    },
  });

  return (
    <CustomThemeContext.Provider
      value={{ darkMode, toggleDarkMode, themeDark, themeLight }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
};

export { CustomThemeContext, CustomThemeProvider };
