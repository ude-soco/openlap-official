import { v4 as uuidv4 } from "uuid";
import GitHubIcon from "@mui/icons-material/GitHub";
import YouTubeIcon from "@mui/icons-material/YouTube";

const navigationIds = {
  HERO: uuidv4(),
  FEATURE: uuidv4(),
  NEWS: uuidv4(),
  PUBLICATION: uuidv4(),
  TEAM: uuidv4(),
  FAQ: uuidv4(),
  CONTACT: uuidv4(),
};

const navigationItems = [
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
  { id: uuidv4(), icon: GitHubIcon, link: "https://github.com/ude-soco" },
  {
    id: uuidv4(),
    icon: YouTubeIcon,
    link: "https://www.youtube.com/channel/UCQV36Dfq-mfmAG0SqrQ_QbA",
  },
];

const legalItems = [
  { id: uuidv4(), name: "Privacy Policy" },
  { id: uuidv4(), name: "Terms of Service" },
  { id: uuidv4(), name: "Contact" },
];

export { navigationIds, navigationItems, socialItems, legalItems };
