import { v4 as uuidv4 } from "uuid";
import Chatti from "../../../assets/team/soco-chatti.jpg";
import Joarder from "../../../assets/team/soco-joarder.jpg";
import Muslim from "../../../assets/team/soco-muslim.png";
import Berger from "../../../assets/team/soco-berger.png";
import Sun from "../../../assets/team/soco-sun.png";
import Mirhashemi from "../../../assets/team/soco-mirhashemi.jpg";
import Liu from "../../../assets/team/soco-liu.png";
import Qintha from "../../../assets/team/soco-qintha.jpeg";
import Nwoke from "../../../assets/team/soco-nwoke.png";
import Avatar from "../../../assets/team/avatar-random.png";

const teamItems = [
  {
    id: uuidv4(),
    name: "Prof. Mohamed Amine Chatti",
    title: "Founder",
    image: Chatti,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Shoeb Joarder",
    title: "Research Associate & PhD Student",
    image: Joarder,
  },
  { id: uuidv4(), name: "Dr. Arham Muslim", title: "Founder", image: Muslim },
  {
    id: uuidv4(),
    name: "Ralf Berger",
    title: "System Administrator",
    image: Berger,
  },
];

const studentItems = [
  {
    id: uuidv4(),
    name: "M.Sc. Abdul-Rahman Khan",
    title: "Master Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Ao Sun",
    title: "Master Thesis Student",
    image: Sun,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Bilawal Wajid Ali",
    title: "Master Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Louis Born",
    title: "Master Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Muhammad Faizan",
    title: "Master Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Samer Javed",
    title: "Master Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Seyedemarzie Mirhashemi",
    title: "Master Thesis Student",
    image: Mirhashemi,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Ruidan Liu",
    title: "Master Thesis Student",
    image: Liu,
  },
  {
    id: uuidv4(),
    name: "B.Sc. Karim Lotfy",
    title: "Bachelor Thesis Student",
    image: Avatar,
  },
  {
    id: uuidv4(),
    name: "B.Sc. Kingson Nwoke",
    title: "Bachelor Thesis Student",
    image: Nwoke,
  },
  {
    id: uuidv4(),
    name: "B.Sc. Qintha Rahma Vierdestya",
    title: "Bachelor Thesis Student",
    image: Qintha,
  },
  {
    id: uuidv4(),
    name: "B.Sc. Rahim Seyidov",
    title: "Bachelor Thesis Student",
    image: Avatar,
  },
];

export { teamItems, studentItems };
