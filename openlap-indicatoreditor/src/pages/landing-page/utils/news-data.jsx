import { Link, Typography } from "@mui/material";
import { v4 as uuidv4 } from "uuid";

const newsItems = [
  {
    id: uuidv4(),
    date: "March 2025",
    title: "New Publication in ICETC 2025",
    desc: (
      <Typography variant="body2" color="textSecondary">
        {`Our paper "The ISC Creator: Human-Centered Design of Learning Analytics Interactive Indicator Specification Cards" by `}
        <Link
          href="https://www.uni-due.de/soco/people/shoeb-joarder.php"
          target="_blank"
        >
          Shoeb Joarder
        </Link>
        {` got accepted as a full research paper on the 17th International Conference on Education Technology and Computers `}
        <Link href="https://www.icetc.org/index.html" target="_blank">
          ICETC 2025
        </Link>
        {`. A link to the paper on arXiv is available `}
        <Link href="https://arxiv.org/pdf/2504.07811" target="_blank">
          here
        </Link>
        {`.`}
      </Typography>
    ),
  },
  {
    id: uuidv4(),
    date: "September 2024",
    title: "OpenLAP @ Learning AID",
    desc: (
      <Typography variant="body2" color="textSecondary">
        {`On September 2 & 3, 2024, `}
        <Link
          href="https://www.uni-due.de/soco/people/shoeb-joarder.php"
          target="_blank"
        >
          Shoeb Joarder
        </Link>
        {` attended the `}
        <Link
          href="https://ki-edu-nrw.ruhr-uni-bochum.de/learning-aid/"
          target="_blank"
        >
          3rd Learning AID
        </Link>
        {` at the Ruhr-University of Bochum. The conference and workshop were organized by the state-funded project `}
        <Link
          href="https://ki-edu-nrw.ruhr-uni-bochum.de/ueber-das-projekt/phase-2/"
          target="_blank"
        >
          KI:edu.nrw
        </Link>
        {` a project to promote Didactics, Ethics, and Technology of Learning Analytics and AI in Higher Education. The event focused on the practical use of learning analytics, artificial intelligence, and data mining in higher education. Shoeb presented our ongoing `}
        <Link
          href="https://www.uni-due.de/soco/research/research-topics.php"
          target="_blank"
        >
          Human-Centered Learning Analytics (HCLA)
        </Link>
        {` research and demoed the Indicator Editor in our `}
        <Link
          href="https://www.uni-due.de/soco/research/projects/openlap.php"
          target="_blank"
        >
          Open Learning Analytics Platform (OpenLAP)
        </Link>
        {`. The Indicator Editor provides an intuitive user interface that supports self-service learning analytics by empowering end-users to take control of the indicator development process.`}
      </Typography>
    ),
  },
  {
    id: uuidv4(),
    date: "June 2024",
    title: "OpenLAP @ LAP24",
    desc: (
      <Typography variant="body2" color="textSecondary">
        {`On June 19, 2024, `}
        <Link
          href="https://www.uni-due.de/soco/people/shoeb-joarder.php"
          target="_blank"
        >
          Shoeb Joarder
        </Link>
        {` attended the event `}
        <Link href="https://solar.swoogo.com/lap24/4978091" target="_blank">
          Learning Analytics in Practice (LAP24)
        </Link>
        {`. LAP24 is a 24-hour, global online event that is intended to highlight and feature learning analytics practitioners around the world discussing and showcasing learning analytics in practice. Shoeb presented our ongoing research on `}
        <Link
          href="https://www.uni-due.de/soco/research/research-topics.php"
          target="_blank"
        >
          Human-Centered Learning Analytics (HCLA)
        </Link>
        {` and gave a demo on the human-centered design and implementation of learning analytics indicators using `}
        <Link
          href="https://www.uni-due.de/soco/research/projects/openlap.php"
          target="_blank"
        >
          Open Learning Analytics Platform (OpenLAP)
        </Link>
        {`. We received positive feedback from LAP24 participants, demonstrating the potential of the OpenLAP ISC Creator and OpenLAP Editor to actively involve different stakeholders in the learning analytics process.`}
      </Typography>
    ),
  },
  {
    id: uuidv4(),
    date: "March 2024",
    title: "SoCo @ LAK24",
    description: `<p>The Social Computing Group was present at the prestigious <a href="http://www.solaresearch.org/events/lak/lak24/" target="_blank">International Learning Analytics and Knowledge Conference</a> (LAK24) in Kyoto, Japan, from March 18-22, 2024. LAK is the premier conference in the field of learning analytics and educational data science. We presented two papers in the context of our ongoing projects <a href="https://www.uni-due.de/soco/research/projects/coursemapper.php">CourseMapper</a>&nbsp;and <a href="https://www.uni-due.de/soco/research/projects/openlap.php">OpenLAP</a>. Qurat Ul Ain presented our full paper&nbsp;&quot;Learner Modeling and Recommendation of Learning Resources using Personal Knowledge Graphs&quot;, available as open access <a href="https://dl.acm.org/doi/10.1145/3636555.3636881" target="_blank">here</a>.&nbsp;Shoeb Joarder presented our poster paper&nbsp;&quot;A No-Code Environment for Implementing Human-Centered Learning Analytics Indicators&quot;, available in LAK24 Companion Proceedings <a href="https://www.solaresearch.org/core/companion-proceedings-of-the-14th-international-learning-analytics-and-knowledge-conference-lak24/" target="_blank">here</a>.</p>`,
    desc: (
      <Typography variant="body2" color="textSecondary">
        {`The Social Computing Group was present at the prestigious `}
        <Link
          href="http://www.solaresearch.org/events/lak/lak24/"
          target="_blank"
        >
          International Learning Analytics and Knowledge Conference
        </Link>
        {` (LAK24) in Kyoto, Japan, from March 18-22, 2024. LAK is the premier conference in the field of learning analytics and educational data science. We presented two papers in the context of our ongoing project `}
        <Link
          href="https://www.uni-due.de/soco/research/projects/openlap.php"
          target="_blank"
        >
          Open Learning Analytics Platform (OpenLAP)
        </Link>
        {`. `}
        <Link
          href="https://www.uni-due.de/soco/people/shoeb-joarder.php"
          target="_blank"
        >
          Shoeb Joarder
        </Link>
        {` presented our poster paper "A No-Code Environment for Implementing Human-Centered Learning Analytics Indicators", available in LAK24 Companion Proceedings `}
        <Link
          href="https://www.solaresearch.org/core/companion-proceedings-of-the-14th-international-learning-analytics-and-knowledge-conference-lak24/"
          target="_blank"
        >
          here
        </Link>
        {`.`}
      </Typography>
    ),
  },
];

export { newsItems };
