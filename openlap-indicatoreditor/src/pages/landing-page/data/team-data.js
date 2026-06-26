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

// `social.type` maps to an icon in teams.jsx (SOCIAL_ICONS). Supported values:
// "linkedin" | "scholar" | "github". This keeps the data free of React/icon
// imports so it stays easy to edit.
const memberItems = [
  {
    id: "mohamed-amine-chatti",
    name: "Prof. Dr. Mohamed Amine Chatti",
    title: "Founder and Scientific Coordinator",
    link: "https://www.uni-due.de/soco/people/mohamed-chatti.php",
    image: Chatti,
    social: [
      {
        id: "chatti-linkedin",
        name: "LinkedIn",
        type: "linkedin",
        link: "https://www.linkedin.com/in/mohamedaminechatti/",
      },
      {
        id: "chatti-scholar",
        name: "Google Scholar",
        type: "scholar",
        link: "https://scholar.google.ca/citations?user=gyLI8FYAAAAJ",
      },
    ],
  },
  {
    id: "shoeb-joarder",
    name: "Shoeb Joarder",
    title: "Project Manager",
    link: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
    image: Joarder,
    social: [
      {
        id: "joarder-linkedin",
        name: "LinkedIn",
        type: "linkedin",
        link: "https://www.linkedin.com/in/shoeb-joarder/",
      },
      {
        id: "joarder-scholar",
        name: "Google Scholar",
        type: "scholar",
        link: "https://scholar.google.com/citations?user=nTq1fhUAAAAJ&hl=de&oi=ao",
      },
      {
        id: "joarder-github",
        name: "GitHub",
        type: "github",
        link: "https://github.com/shoebjoarder",
      },
    ],
  },
  {
    id: "arham-muslim",
    name: "Dr. Arham Muslim",
    title: "Founder",
    image: Muslim,
    link: "https://www.uni-due.de/soco/people/arham-muslim.php",
    social: [
      {
        id: "muslim-linkedin",
        name: "LinkedIn",
        type: "linkedin",
        link: "https://www.linkedin.com/in/arham-muslim-41482b9/",
      },
      {
        id: "muslim-scholar",
        name: "Google Scholar",
        type: "scholar",
        link: "https://scholar.google.de/citations?user=l-NjDaUAAAAJ&hl=de&oi=ao",
      },
    ],
  },
];

const peopleItems = [
  {
    id: "abdul-rahman-khan",
    name: "Abdul-Rahman Khan",
    image: Abdul,
    link: "https://www.uni-due.de/soco/people/abdulrahman-khan.php",
  },
  {
    id: "ao-sun",
    name: "Ao Sun",
    image: Ao,
    link: "https://www.uni-due.de/soco/people/ao-sun.php",
  },
  {
    id: "bilawal-wajid-ali",
    name: "Bilawal Wajid Ali",
    image: Bilawal,
    link: "https://www.uni-due.de/soco/people/bilawal-wajid.php",
  },
  {
    id: "louis-born",
    name: "Louis Born",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/louis-born.php",
  },
  {
    id: "muhammad-faizan",
    name: "Muhammad Faizan",
    image: Faizan,
    link: "https://www.uni-due.de/soco/people/faizan-riaz.php",
  },
  {
    id: "sammar-javed",
    name: "Sammar Javed",
    image: Sammar,
    link: "https://www.uni-due.de/soco/people/sammar-javed.php",
  },
  {
    id: "seyedemarzie-mirhashemi",
    name: "Seyedemarzie Mirhashemi",
    image: Marzie,
    link: "https://www.uni-due.de/soco/people/seyedemarzie-mirhashemi.php",
  },
  {
    id: "ruidan-liu",
    name: "Ruidan Liu",
    image: Ruidan,
    link: "https://www.uni-due.de/soco/people/ruidan-liu.php",
  },
  {
    id: "karim-lotfy",
    name: "Karim Lotfy",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/karim-lotfy.php",
  },
  {
    id: "kingson-nwoke",
    name: "Kingson Nwoke",
    image: Kingson,
    link: "https://www.uni-due.de/soco/people/kingson-nwoke.php",
  },
  {
    id: "qintha-rahma-vierdestya",
    name: "Qintha Rahma Vierdestya",
    image: Qintha,
    link: "https://www.uni-due.de/soco/people/qintha-vierdestya.php",
  },
  {
    id: "rahim-seyidov",
    name: "Rahim Seyidov",
    image: Avatar,
    link: "https://www.uni-due.de/soco/people/rahim-seyidov.php",
  },
  {
    id: "ralf-berger",
    name: "Ralf Berger",
    title: "System Administrator",
    image: Berger,
    link: "https://www.linkedin.com/in/ralf-berger/",
  },
  {
    id: "bassim-bachir",
    name: "Bassim Bachir",
    image: Avatar,
    link: "https://www.linkedin.com/in/bassim-b-7372a53b/",
  },
  {
    id: "oscar-barrios",
    name: "Oscar Barrios",
    image: Avatar,
    link: "https://www.linkedin.com/in/oscarbarriosvarela/",
  },
];

export { memberItems, peopleItems };
