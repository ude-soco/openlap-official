import { v4 as uuidv4 } from "uuid";
import Chatti from "../../../assets/team/soco-chatti.jpg";
import Joarder from "../../../assets/team/soco-joarder.jpg";
import Muslim from "../../../assets/team/soco-muslim.png";
import Berger from "../../../assets/team/soco-berger.png";
import Avatar from "../../../assets/team/avatar-random.png";
import GitHubIcon from "@mui/icons-material/GitHub";
import SchoolIcon from "@mui/icons-material/School";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

const teamItems = [
  {
    id: uuidv4(),
    name: "Prof. Dr. Mohamed Amine Chatti",
    title: "Founder and Scientific Coordinator",
    image: Chatti,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/mohamedaminechatti/",
        icon: LinkedInIcon,
      },
      {
        id: uuidv4(),
        name: "Google Scholar",
        link: "https://scholar.google.ca/citations?user=gyLI8FYAAAAJ",
        icon: SchoolIcon,
      },
    ],
  },
  {
    id: uuidv4(),
    name: "M.Sc. Shoeb Joarder",
    title: "Project Manager",
    image: Joarder,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/shoeb-joarder/",
        icon: LinkedInIcon,
      },
      {
        id: uuidv4(),
        name: "Google Scholar",
        link: "https://scholar.google.com/citations?user=nTq1fhUAAAAJ&hl=de&oi=ao",
        icon: SchoolIcon,
      },
      {
        id: uuidv4(),
        name: "GitHub",
        link: "https://github.com/shoebjoarder",
        icon: GitHubIcon,
      },
    ],
  },
  {
    id: uuidv4(),
    name: "Dr. Arham Muslim",
    title: "Founder",
    image: Muslim,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/arham-muslim-41482b9/",
        icon: LinkedInIcon,
      },
      {
        id: uuidv4(),
        name: "Google Scholar",
        link: "https://scholar.google.de/citations?user=l-NjDaUAAAAJ&hl=de&oi=ao",
        icon: SchoolIcon,
      },
    ],
  },
];

const studentItems = [
  {
    id: uuidv4(),
    name: "Ralf Berger",
    title: "System Administrator",
    image: Berger,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/ralf-berger/",
        icon: LinkedInIcon,
      },
    ],
  },
  {
    id: uuidv4(),
    name: "M.Sc. Bassim Bachir",
    title: "Master Thesis Student",
    image: Avatar,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/bassim-b-7372a53b/",
        icon: LinkedInIcon,
      },
    ],
  },
  {
    id: uuidv4(),
    name: "M.Sc. Oscar Barrios",
    title: "Master Thesis Student",
    image: Avatar,
    social: [
      {
        id: uuidv4(),
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/oscarbarriosvarela/",
        icon: LinkedInIcon,
      },
    ],
  },
];

export { teamItems, studentItems };
