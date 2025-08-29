import { v4 as uuidv4 } from "uuid";

const faqItems = [
  {
    id: uuidv4(),
    question: "What is OpenLAP?",
    answer:
      "OpenLAP (Open Learning Analytics Platform) is a framework designed to address key challenges in Open Learning Analytics (OLA)—such as data integration, modularity, interoperability, privacy, and personalization. It offers a detailed technical architecture and a fully implemented platform supporting diverse stakeholders in learning analytics",
  },
  {
    id: uuidv4(),
    question: "What architecture does OpenLAP use?",
    answer:
      "The platform comprises three main components: Indicator Engine: An intuitive UI for developing analytics indicators. Analytics Framework: Handles the generation, execution, and management of these indicators. Data Collection and Management: Facilitates xAPI-based data collection and enforces data privacy policies",
  },
  {
    id: uuidv4(),
    question: "What is the Indicator Specification Cards (ISC) method?",
    answer:
      "ISC is a theory-informed approach based on the Goal–Question–Indicator (GQI) model and Munzner’s What-Why-How visualization framework. It guides stakeholders through designing analytics indicators—from defining goals (“Why?”) to choosing visualizations (“How?”)",
  },
  {
    id: uuidv4(),
    question: "What is the ISC Creator module?",
    answer:
      "The ISC Creator offers a low-fidelity, user-friendly UI to co-design learning analytics indicators using the Indicator Specification Cards methodology",
  },
  {
    id: uuidv4(),
    question: "What does the xAPI-CSV Converter module do?",
    answer:
      "This tool ensures data flexibility by enabling easy conversion between xAPI and CSV formats. Users can: Convert xAPI data to CSV for use with the ISC Creator. Convert CSV back to xAPI to develop high-fidelity indicators",
  },
  {
    id: uuidv4(),
    question: "What types of indicators can the Indicator Editor handle?",
    answer:
      "The Indicator Editor supports three indicator types: Basic, Composite, and Multi-level Analysis, enabling users to build a wide range of analytics insights through an intuitive UI",
  },
  {
    id: uuidv4(),
    question: "How does OpenLAP embody a human-centered approach?",
    answer:
      "OpenLAP adheres to a Human-Centered Learning Analytics (HCLA) philosophy, involving end-users in the flexible definition and creation of personalized analytics indicators—supporting user engagement at every step",
  },
  {
    id: uuidv4(),
    question: "What technologies does OpenLAP use?",
    answer:
      "Client-side: React and Material UI. Server-side: Java Spring Boot, MongoDB, and Learning Locker (for learning data storage and management)",
  },
  {
    id: uuidv4(),
    question: "Is there a live demo or GitHub repository available?",
    answer:
      "Yes. You can explore a working OpenLAP demo here. The GitHub repository is also accessible for code, documentation, and development insights",
  },
  {
    id: uuidv4(),
    question: "Where has OpenLAP been presented or published?",
    answer:
      "Conference Presentations: Including LAK24 in Kyoto (March 2024) and Learning AID 2023 in Bochum. Publications: Multiple in proceedings and book chapters, e.g. on ISC Creator, no-code environments for indicator development, and theory-driven analytics designs",
  },
];

export { faqItems };
