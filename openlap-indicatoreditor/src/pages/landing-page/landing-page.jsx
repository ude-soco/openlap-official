import { useContext, useMemo } from "react";
import { Box, Divider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CustomThemeContext } from "../../setup/theme-manager/theme-context-manager";
import { createLandingTheme } from "./theme/landing-theme";
import AppAppBar from "./components/app-appbar";
import Hero from "./components/hero";
import Features from "./components/features/features";
import Footer from "./components/footer";
import Publications from "./components/publications";
import News from "./components/news";
import Teams from "./components/teams";
import ContactUs from "./components/contact-us";
import LogoCollection from "./components/logo-collection";
import Architecture from "./components/architecture";

const LandingPage = () => {
  // Layer the landing design system on top of the app's base (light/dark)
  // theme, scoped to this subtree only via the nested ThemeProvider.
  const { theme } = useContext(CustomThemeContext);
  const landingTheme = useMemo(() => createLandingTheme(theme), [theme]);

  return (
    <ThemeProvider theme={landingTheme}>
      <Box sx={{ fontFamily: landingTheme.typography.fontFamily }}>
        <AppAppBar />
        <Hero />
        <Architecture />
        <LogoCollection />
        <Divider />
        <Features />
        <Divider />
        <Teams />
        <Divider />
        <News />
        <Divider />
        <Publications />
        <Divider />
        <ContactUs />
        <Divider />
        <Footer />
      </Box>
    </ThemeProvider>
  );
};

export default LandingPage;
