import { v4 as uuidv4 } from "uuid";
import Chatti from "../../../assets/team/soco-chatti.jpg";
import Joarder from "../../../assets/team/soco-joarder.jpg";
import Muslim from "../../../assets/team/soco-muslim.png";
import Berger from "../../../assets/team/soco-berger.png";
import Sun from "../../../assets/team/soco-sun.png";
import Liu from "../../../assets/team/soco-liu.png";
import Nwoke from "../../../assets/team/soco-nwoke.png";

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
    title: "PhD Student",
    image: Joarder,
  },
  { id: uuidv4(), name: "Dr. Arham Muslim", title: "Founder", image: Muslim },
  {
    id: uuidv4(),
    name: "Ralf Berger",
    title: "System Administrator",
    image: Berger,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Ao Sun",
    title: "Master Thesis Student",
    image: Sun,
  },
  {
    id: uuidv4(),
    name: "M.Sc. Ruidan Liu",
    title: "Master Thesis Student",
    image: Liu,
  },
  {
    id: uuidv4(),
    name: "B.Sc. Kingson Nwoke",
    title: "Master Thesis Student",
    image: Nwoke,
  },
];

export { teamItems };
