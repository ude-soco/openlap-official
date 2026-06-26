// News content as plain data (no JSX).
//
// Each item has:
//   slug    - stable, human-readable id (also unique React key)
//   date    - ISO 8601 (YYYY-MM-DD), used for sorting. The UI formats it as
//             e.g. "March 2026", so the day part can just be "01".
//   title   - headline
//   venue   - optional line shown under the description
//   body    - an array of "parts". A part is either:
//               * a plain string, or
//               * a link object: { text: "label", href: "https://..." }
//             Parts are rendered inline in order, so links sit naturally inside
//             the surrounding text.
const newsItems = [
  {
    slug: "2026-03-jla-self-service-indicators",
    date: "2026-03-01",
    title: "New publication in Journal of Learning Analytics",
    body: [
      "Our paper “Human-Centered Development of Indicators for Self-Service Learning Analytics: A Transparency through Exploration Approach,” has been published in early access in the Journal of Learning Analytics. The paper is available ",
      { text: "here", href: "https://arxiv.org/pdf/2504.07811" },
      ".",
    ],
  },
  {
    slug: "2026-03-csedu-usability-evaluation",
    date: "2026-03-01",
    title: "New Publication in CSEDU 2026",
    body: [
      'Our paper "Usability Evaluation and Improvement of a Tool for Self-Service Learning Analytics" by ',
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      " got accepted as a research paper on the 18th International Conference on Computer Supported Education ",
      { text: "CSEDU 2026", href: "https://csedu.scitevents.org/" },
      ". A link to the paper on arXiv is available ",
      { text: "here", href: "https://arxiv.org/pdf/2603.24321" },
      ".",
    ],
  },
  {
    slug: "2025-09-icetc-participation",
    date: "2025-09-01",
    title: "SoCo @ ICETC 2025",
    body: [
      "We participated in the 17th International Conference on Education Technology and Computers (",
      { text: "ICETC 2025", href: "https://www.icetc.org/index.html" },
      ") Barcelona, Spain, on September 18-21, 2025. ",
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      " presented our platform ",
      {
        text: "OpenLAP",
        href: "https://www.uni-due.de/soco/research/projects/openlap.php",
      },
      ' to the ICETC community, highlighting its unique features to democratize learning analytics and support learning analytics stakeholders to co-design their own indicators. He presented our paper "The ISC Creator: Human-Centered Deisgn of Learning Analytics Interactive Indicator Specification Cards", which presents the systematic design, implementation, and evaluation details of the no-code, co-design tool, the OpenLAP ISC Creator, which allows low-cost and flexible design of LA indicators. The paper is available on arXiv ',
      { text: "here", href: "https://arxiv.org/pdf/2504.07811" },
      ".",
    ],
  },
  {
    slug: "2025-03-icetc-isc-creator-accepted",
    date: "2025-03-01",
    title: "New Publication in ICETC 2025",
    body: [
      'Our paper "The ISC Creator: Human-Centered Design of Learning Analytics Interactive Indicator Specification Cards" by ',
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      " got accepted as a full research paper on the 17th International Conference on Education Technology and Computers ",
      { text: "ICETC 2025", href: "https://www.icetc.org/index.html" },
      ". A link to the paper on arXiv is available ",
      { text: "here", href: "https://arxiv.org/pdf/2504.07811" },
      ".",
    ],
  },
  {
    slug: "2024-09-learning-aid",
    date: "2024-09-01",
    title: "OpenLAP @ Learning AID",
    body: [
      "On September 2 & 3, 2024, ",
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      " attended the ",
      {
        text: "3rd Learning AID",
        href: "https://ki-edu-nrw.ruhr-uni-bochum.de/learning-aid/",
      },
      " at the Ruhr-University of Bochum. The conference and workshop were organized by the state-funded project ",
      {
        text: "KI:edu.nrw",
        href: "https://ki-edu-nrw.ruhr-uni-bochum.de/ueber-das-projekt/phase-2/",
      },
      " a project to promote Didactics, Ethics, and Technology of Learning Analytics and AI in Higher Education. The event focused on the practical use of learning analytics, artificial intelligence, and data mining in higher education. Shoeb presented our ongoing ",
      {
        text: "Human-Centered Learning Analytics (HCLA)",
        href: "https://www.uni-due.de/soco/research/research-topics.php",
      },
      " research and demoed the Indicator Editor in our ",
      {
        text: "Open Learning Analytics Platform (OpenLAP)",
        href: "https://www.uni-due.de/soco/research/projects/openlap.php",
      },
      ". The Indicator Editor provides an intuitive user interface that supports self-service learning analytics by empowering end-users to take control of the indicator development process.",
    ],
  },
  {
    slug: "2024-06-lap24",
    date: "2024-06-01",
    title: "OpenLAP @ LAP24",
    body: [
      "On June 19, 2024, ",
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      " attended the event ",
      {
        text: "Learning Analytics in Practice (LAP24)",
        href: "https://solar.swoogo.com/lap24/4978091",
      },
      ". LAP24 is a 24-hour, global online event that is intended to highlight and feature learning analytics practitioners around the world discussing and showcasing learning analytics in practice. Shoeb presented our ongoing research on ",
      {
        text: "Human-Centered Learning Analytics (HCLA)",
        href: "https://www.uni-due.de/soco/research/research-topics.php",
      },
      " and gave a demo on the human-centered design and implementation of learning analytics indicators using ",
      {
        text: "Open Learning Analytics Platform (OpenLAP)",
        href: "https://www.uni-due.de/soco/research/projects/openlap.php",
      },
      ". We received positive feedback from LAP24 participants, demonstrating the potential of the OpenLAP ISC Creator and OpenLAP Editor to actively involve different stakeholders in the learning analytics process.",
    ],
  },
  {
    slug: "2024-03-lak24",
    date: "2024-03-01",
    title: "SoCo @ LAK24",
    body: [
      "The Social Computing Group was present at the prestigious ",
      {
        text: "International Learning Analytics and Knowledge Conference",
        href: "http://www.solaresearch.org/events/lak/lak24/",
      },
      " (LAK24) in Kyoto, Japan, from March 18-22, 2024. LAK is the premier conference in the field of learning analytics and educational data science. We presented two papers in the context of our ongoing project ",
      {
        text: "Open Learning Analytics Platform (OpenLAP)",
        href: "https://www.uni-due.de/soco/research/projects/openlap.php",
      },
      ". ",
      {
        text: "Shoeb Joarder",
        href: "https://www.uni-due.de/soco/people/shoeb-joarder.php",
      },
      ' presented our poster paper "A No-Code Environment for Implementing Human-Centered Learning Analytics Indicators", available in LAK24 Companion Proceedings ',
      {
        text: "here",
        href: "https://www.solaresearch.org/core/companion-proceedings-of-the-14th-international-learning-analytics-and-knowledge-conference-lak24/",
      },
      ".",
    ],
  },
];

export { newsItems };
