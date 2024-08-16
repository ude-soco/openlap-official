import Distribution from "../../../../assets/images/isc_charts_filter/distribution.svg";
import Outliers from "../../../../assets/images/isc_charts_filter/outliers.svg";
import Trends from "../../../../assets/images/isc_charts_filter/trends.svg";
import Relationship from "../../../../assets/images/isc_charts_filter/relationship.svg";
import Cluster from "../../../../assets/images/isc_charts_filter/feature.svg";
import Paths from "../../../../assets/images/isc_charts_filter/paths.svg";
import Topology from "../../../../assets/images/isc_charts_filter/topology.svg";

const filterTypesList = [
  {
    image: Distribution,
    name: "Distribution",
    description:
      "Focuses on visualizing the distribution of data. It helps users understand how data points are spread across different values or categories. \n\n For example, a histogram or a box plot can show the distribution of ages in a population, helping to identify patterns like whether the data is skewed or evenly distributed.",
  },
  // {
  //   image: Cluster,
  //   name: "Cluster",
  //   description:
  //     "Aims to  identify and visualize natural groups or clusters within data. It's used to spot patterns and similarities among data points, making it useful for tasks like categorization and finding hidden structures in the data. \n\n Visualizations may employ colors or shapes to differentiate clusters, aiding in data exploration and analysis.",
  // },
  {
    image: Outliers,
    name: "Outliers",
    description:
      "Aims to identify and highlight data points that significantly deviate from the majority. Outliers can be extreme values or anomalies that might carry special significance or require further investigation. \n\n Visualizations that emphasize outliers can assist in detecting errors, fraud, or unusual patterns in data.",
  },
  // {
  //   image: Paths,
  //   name: "Paths",
  // },
  {
    image: Trends,
    name: "Trends",
    description:
      "Aims to visualize how data changes over time or across some other ordered dimension. \n\n Users can observe patterns, fluctuations, or long-term changes in data by focusing on this target",
  },
  {
    image: Relationship,
    name: "Part-to-whole relationship",
    description:
      "Relationship or Part-to-whole relationship aims to explore the connections between multiple variables or dimensions in data. Visualizations for relationships help users understand how changes in one variable relate to changes in another. \n\n Analyzing relationships can uncover patterns, dependencies, or cause-and-effect relationships in data.",
  },
  // {
  //   image: Topology,
  //   name: "Topology",
  // },
];

export default filterTypesList;
