import { Divider } from "@mui/material";
import AppAppBar from "./components/app-appbar";
import Hero from "./components/hero";
import Features from "./components/features";
import Footer from "./components/footer";
import Publications from "./components/publications";
import News from "./components/news";
import Teams from "./components/teams";
import ContactUs from "./components/contact-us";
import LogoCollection from "./components/logo-collection";
import Architecture from "./components/architecture";
import ISCCreatorFeature from "./components/isc-creator-feature";
import IndicatorEditorFeature from "./components/indicator-editor-feature";

const LandingPage = () => {
  return (
    <>
      <AppAppBar />
      <Hero />
      <Architecture />
      <LogoCollection />
      <Divider />
      <Features />
      <ISCCreatorFeature />
      <IndicatorEditorFeature />
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
    </>
  );
};

export default LandingPage;
