import { v4 as uuidv4 } from "uuid";
import Chatti from "../../../assets/team/soco-chatti.jpg";
import Joarder from "../../../assets/team/soco-joarder.jpg";
import Muslim from "../../../assets/team/soco-muslim.png";
import Berger from "../../../assets/team/soco-berger.png";
import Avatar from "../../../assets/team/avatar-random.png";
import Abdul from "../../../assets/team/soco-abdul-rahman.jpeg";
import Ao from "../../../assets/team/soco-ao.png";
import Bilawal from "../../../assets/team/soco-bilawal.jpg";
import Faizan from "../../../assets/team/soco-faizan.jpg";
import Kingson from "../../../assets/team/soco-kingson.png";
import Marzie from "../../../assets/team/soco-marzie.jpg";
import Qintha from "../../../assets/team/soco-qintha.jpeg";
import Ruidan from "../../../assets/team/soco-ruidan.jpeg";
import Sammar from "../../../assets/team/soco-sammar.jpg";
import GitHubIcon from "@mui/icons-material/GitHub";
import SchoolIcon from "@mui/icons-material/School";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";

const memberItems = [
  {
    id: uuidv4(),
    name: "Prof. Dr. Mohamed Amine Chatti",
    title: "Founder and Scientific Coordinator",
    link: "https://www.uni-due.de/soco/people/mohamed-chatti.php",
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
    name: "Shoeb Joarder",
    title: "Project Manager",
    link: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
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
    link: "https://www.uni-due.de/soco/people/arham-muslim.php",
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

const peopleItems = [
  {
    id: uuidv4(),
    name: "Abdul-Rahman Khan",
    image: Abdul,
    link: "https://www.uni-due.de/soco/people/abdulrahman-khan.php",
  },
  {
    id: uuidv4(),
    name: "Ao Sun",
    image: Ao,
    link: "https://www.uni-due.de/soco/people/ao-sun.php",
  },
  {
    id: uuidv4(),
    name: "Bilawal Wajid Ali",
    image: Bilawal,
    link: "https://www.uni-due.de/soco/people/bilawal-wajid.php",
  },
  {
    id: uuidv4(),
    name: "Louis Born",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/louis-born.php",
  },
  {
    id: uuidv4(),
    name: "Muhammad Faizan",
    image: Faizan,
    link: "https://www.uni-due.de/soco/people/faizan-riaz.php",
  },
  {
    id: uuidv4(),
    name: "Sammar Javed",
    image: Sammar,
    link: "https://www.uni-due.de/soco/people/sammar-javed.php",
  },
  {
    id: uuidv4(),
    name: "Seyedemarzie Mirhashemi",
    image: Marzie,
    link: "https://www.uni-due.de/soco/people/seyedemarzie-mirhashemi.php",
  },
  {
    id: uuidv4(),
    name: "Ruidan Liu",
    image: Ruidan,
    link: "https://www.uni-due.de/soco/people/ruidan-liu.php",
  },
  {
    id: uuidv4(),
    name: "Karim Lotfy",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/karim-lotfy.php",
  },
  {
    id: uuidv4(),
    name: "Kingson Nwoke",
    image: Kingson,
    link: "https://www.uni-due.de/soco/people/kingson-nwoke.php",
  },
  {
    id: uuidv4(),
    name: "Qintha Rahma Vierdestya",
    image: Qintha,
    link: "https://www.uni-due.de/soco/people/qintha-vierdestya.php",
  },
  {
    id: uuidv4(),
    name: "Rahim Seyidov",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/rahim-seyidov.php",
  },
  {
    id: uuidv4(),
    name: "Ralf Berger",
    title: "System Administrator",
    image: Berger,
    link: "https://www.linkedin.com/in/ralf-berger/",
  },
  {
    id: uuidv4(),
    name: "Bassim Bachir",
    image: Avatar,
    link: "https://www.linkedin.com/in/bassim-b-7372a53b/",
  },
  {
    id: uuidv4(),
    name: "Oscar Barrios",
    image: Avatar,
    link: "https://www.linkedin.com/in/oscarbarriosvarela/",
  },
];

export { memberItems, peopleItems };
