import GitHubIcon from "@mui/icons-material/GitHub";
import YouTubeIcon from "@mui/icons-material/YouTube";

// Stable, human-readable ids. These are also used as DOM element ids for the
// scroll-to-section navigation, so keep them URL/anchor friendly.
const navigationIds = {
  HERO: "hero",
  FEATURE: "feature",
  ARCHITECTURE: "architecture",
  NEWS: "news",
  PUBLICATION: "publication",
  TEAM: "team",
  CONTACT: "contact",
};

const navigationItems = [
  {
    id: navigationIds.ARCHITECTURE,
    name: "Architecture",
  },
  {
    id: navigationIds.FEATURE,
    name: "Features",
  },
  {
    id: navigationIds.TEAM,
    name: "Team",
  },
  {
    id: navigationIds.NEWS,
    name: "News",
  },
  {
    id: navigationIds.PUBLICATION,
    name: "Publications",
  },
  {
    id: navigationIds.CONTACT,
    name: "Contact Us",
  },
];

const socialItems = [
  { id: "github", icon: GitHubIcon, link: "https://github.com/ude-soco" },
  {
    id: "youtube",
    icon: YouTubeIcon,
    link: "https://www.youtube.com/channel/UCQV36Dfq-mfmAG0SqrQ_QbA",
  },
];

const legalItems = [
  { id: "privacy-policy", name: "Privacy Policy", link: "/privacy" },
  { id: "terms-of-service", name: "Terms of Service", link: "/" },
  { id: "contact", name: "Contact", link: "/" },
];

export { navigationIds, navigationItems, socialItems, legalItems };
