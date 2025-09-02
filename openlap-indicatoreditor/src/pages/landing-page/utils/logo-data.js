import { v4 as uuidv4 } from "uuid";
import LearningLockerLight from "../../../assets/home/logo/learning-locker-light.svg";
import LearningLockerDark from "../../../assets/home/logo/learning-locker-dark.svg";
import MaterialUILight from "../../../assets/home/logo/material-ui-light.svg";
import MaterialUIDark from "../../../assets/home/logo/material-ui-dark.svg";
import MongoDBLight from "../../../assets/home/logo/mongo-light.svg";
import MongoDBDark from "../../../assets/home/logo/mongo-dark.svg";
import ReactLight from "../../../assets/home/logo/react-light.svg";
import ReactDark from "../../../assets/home/logo/react-dark.svg";
import SpringLight from "../../../assets/home/logo/spring-light.svg";
import SpringDark from "../../../assets/home/logo/spring-dark.svg";

const logoItems = [
  {
    id: uuidv4(),
    name: "Learning Locker",
    imageLight: LearningLockerLight,
    imageDark: LearningLockerDark,
  },
  {
    id: uuidv4(),
    name: "Material UI",
    imageLight: MaterialUILight,
    imageDark: MaterialUIDark,
  },
  {
    id: uuidv4(),
    name: "React",
    imageLight: ReactLight,
    imageDark: ReactDark,
  },
  {
    id: uuidv4(),
    name: "Spring",
    imageLight: SpringLight,
    imageDark: SpringDark,
  },
  {
    id: uuidv4(),
    name: "MongoDB",
    imageLight: MongoDBLight,
    imageDark: MongoDBDark,
  },
];

export { logoItems };
