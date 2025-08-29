import { useContext } from "react";
import { CustomThemeContext } from "../../setup/theme-manager/theme-context-manager";
import AppAppBar from "./components/app-appbar";
import Hero from "./components/hero";
import Features from "./components/features";
import Footer from "./components/footer";
import { Divider } from "@mui/material";
import Publications from "./components/publications";

const LandingPage = () => {
  const { darkMode, toggleDarkMode } = useContext(CustomThemeContext);
  return (
    <>
      <AppAppBar />
      <Hero />
      <Features />
      <Divider />
      <Publications />
      <Divider />
      <Footer />
    </>
  );
};

export default LandingPage;
