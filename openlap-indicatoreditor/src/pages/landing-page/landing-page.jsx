import AppAppBar from "./components/app-appbar";
import Hero from "./components/hero";
import Features from "./components/features";
import Footer from "./components/footer";
import { Divider } from "@mui/material";
import Publications from "./components/publications";
import News from "./components/news";
import Teams from "./components/teams";
import FAQ from "./components/faq";

const LandingPage = () => {
  return (
    <>
      <AppAppBar />
      <Hero />
      <Features />
      <Divider />
      <News />
      <Divider />
      <Publications />
      <Divider />
      <Teams />
      <Divider />
      <FAQ />
      <Divider />
      <Footer />
    </>
  );
};

export default LandingPage;
