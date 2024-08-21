import { v4 as uuidv4 } from "uuid";

const goalList = [
  {
    id: uuidv4(),
    category: "Assessment",
    verb: "assess",
    custom: false,
    description:
      "Evaluating and analyzing a situation or performance to gain insights and understanding.",
  },
  {
    id: uuidv4(),
    category: "Awareness",
    verb: "be aware of",
    custom: false,
    description:
      "Developing a deep understanding of oneself, others, or a particular subject.",
  },
  {
    id: uuidv4(),
    category: "Feedback",
    verb: "get feedback",
    custom: false,
    description:
      "Providing or receiving constructive comments and information to improve or enhance performance.",
  },
  {
    id: uuidv4(),
    category: "Help seeking",
    verb: "seek help",
    custom: false,
    description:
      "Actively seeking assistance, advice, or support from others when needed.",
  },
  {
    id: uuidv4(),
    category: "Intervention",
    verb: "intervene",
    custom: false,
    description:
      "Taking action or implementing measures to address a specific issue or problem.",
  },
  // {
  //   id: uuidv4(),
  //   category: "Goal setting",
  //   verb: "set goal(s)",
  //   custom: false,
  //   description: "Defining clear and achievable objectives to work towards.",
  // },
  {
    id: uuidv4(),
    category: "Monitoring",
    verb: "monitor",
    custom: false,
    description:
      "Keeping a close watch on progress or changes in a situation over time.",
  },
  {
    id: uuidv4(),
    category: "Motivation",
    verb: "motivate",
    custom: false,
    description:
      "Cultivating the drive and enthusiasm to achieve desired outcomes.",
  },
  {
    id: uuidv4(),
    category: "Planning",
    verb: "plan",
    custom: false,
    description:
      "Developing strategies and organizing steps to achieve specific goals.",
  },
  {
    id: uuidv4(),
    category: "Recommendation",
    verb: "recommend",
    custom: false,
    description: "Providing suggestions or advice based on data or expertise.",
  },
  {
    id: uuidv4(),
    category: "Reflection",
    verb: "reflect",
    custom: false,
    description:
      "Thoughtfully considering and analyzing experiences, actions, or thoughts.",
  },
  {
    id: uuidv4(),
    category: "Self-evaluation",
    verb: "self-evaluate",
    custom: false,
    description: "Assessing one's own performance, behavior, or progress.",
  },
  {
    id: uuidv4(),
    category: "Self-monitoring",
    verb: "self-monitor",
    custom: false,
    description:
      "Keeping track of one's own actions, behaviors, or conditions.",
  },
  // {
  //   id: uuidv4(),
  //   category: "Self-reflection",
  //   verb: "self-reflect",
  //   custom: false,
  //   description:
  //     "Deeply considering one's thoughts, emotions, and personal growth.",
  // },
  {
    id: uuidv4(),
    category: "Time management",
    verb: "manage time",
    custom: false,
    description: "Effectively using time to prioritize tasks and activities.",
  },
];

export default goalList;
