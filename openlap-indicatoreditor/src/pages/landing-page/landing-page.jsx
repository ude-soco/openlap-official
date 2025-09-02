import AppAppBar from "./components/app-appbar";
import Hero from "./components/hero";
import Features from "./components/features";
import Footer from "./components/footer";
import { Divider } from "@mui/material";
import Publications from "./components/publications";
import News from "./components/news";
import Teams from "./components/teams";
import ContactUs from "./components/contact-us";
import LogoCollection from "./components/logo-collection";

const LandingPage = () => {
  return (
    <>
      <AppAppBar />
      <Hero />
      <Features />
      <LogoCollection />
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
