import BarChartImage from "../../../../../assets/images/isc_charts/bar_graph.svg";
import BarChartDescriptionImage from "../../../../../assets/images/isc_charts_description/bar_chart.png";
import BarChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/bar_chart_desc.png";
import ScatterPlotImage from "../../../../../assets/images/isc_charts/scatterplot.svg";
import ScatterPlotDescriptionImage from "../../../../../assets/images/isc_charts_description/scatterplot.png";
import ScatterPlotFullDescriptionImage from "../../../../../assets/images/isc_charts_description/scatterplot_desc.png";
import LineChartImage from "../../../../../assets/images/isc_charts/line_graph.svg";
import LineChartDescriptionImage from "../../../../../assets/images/isc_charts_description/line_graph.png";
import LineChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/line_graph_desc.png";
import PolarAreaChartImage from "../../../../../assets/images/isc_charts/polar_area_chart.svg";
import PolarAreaChartDescriptionImage from "../../../../../assets/images/isc_charts_description/polar_area_chart.svg";
import PolarAreaChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/polar_area_chart_desc.svg";
import PieChartImage from "../../../../../assets/images/isc_charts/pie_chart.svg";
import PieChartDescriptionImage from "../../../../../assets/images/isc_charts_description/pie_chart.png";
import PieChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/pie_chart_desc.png";
import StackedBarChartImage from "../../../../../assets/images/isc_charts/stacked_bar_graph.svg";
import StackedBarChartDescriptionImage from "../../../../../assets/images/isc_charts_description/stacked_bar_graph.png";
import StackedBarChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/stacked_bar_graph_desc.png";
import GroupedBarChartImage from "../../../../../assets/images/isc_charts/grouped_bar_chart.svg";
import GroupedBarChartDescriptionImage from "../../../../../assets/images/isc_charts_description/grouped_bar_chart.png";
import GroupedBarChartFullDescriptionImage from "../../../../../assets/images/isc_charts_description/grouped_bar_chart_desc.png";
import DistributionImage from "../../../../../assets/images/isc_charts_filter/distribution.svg";
import OutliersImage from "../../../../../assets/images/isc_charts_filter/outliers.svg";
import TrendsImage from "../../../../../assets/images/isc_charts_filter/trends.svg";
import RelationshipImage from "../../../../../assets/images/isc_charts_filter/relationship.svg";
import ClusterImage from "../../../../../assets/images/isc_charts_filter/feature.svg";
import PathsImage from "../../../../../assets/images/isc_charts_filter/paths.svg";
import TopologyImage from "../../../../../assets/images/isc_charts_filter/topology.svg";

const DataTypes = {
  categorical: {
    value: "Categorical",
    type: "string",
    description:
      "Categorical data, also known as nominal data, classifies information into distinct, non-ordered categories. For instance, colors (e.g., red, blue, green) are categorical data, with no inherent hierarchy or order.",
  },
  numerical: {
    value: "Numerical",
    type: "number",
    description:
      "Numerical data means using numbers to describe things like age, height, or income. It's possible to count or measure using this data type.",
  },
  catOrdered: {
    value: "Categorical (ordinal)",
    type: "string",
    description:
      "An 'ordinal' categorical variable has a clear ordering. For example, temperature as a variable with three orderly categories (low, medium and high)",
  },
};

const ChartTypes = {
  distribution: "Distribution",
  outliers: "Outliers",
  trends: "Trends",
  relationship: "Part-to-whole relationship",
  cluster: "Cluster",
  paths: "Paths",
  topology: "Topology",
};

const VisualizationTypes = {
  bar: "Bar chart",
  dot: "Dot chart",
  scatter: "Scatter Plot",
  groupedBar: "Grouped bar Chart",
  line: "Line chart",
  polar: "Polar Area Chart",
  pie: "Pie Chart",
  stackedBar: "Stacked Bar Chart",
};

const chartFilters = [
  {
    image: DistributionImage,
    type: ChartTypes.distribution,
    description:
      "Focuses on visualizing the distribution of data. It helps users understand how data points are spread across different values or categories. \n\n For example, a histogram or a box plot can show the distribution of ages in a population, helping to identify patterns like whether the data is skewed or evenly distributed.",
    enable: true,
  },
  {
    image: ClusterImage,
    type: ChartTypes.cluster,
    description:
      "Aims to  identify and visualize natural groups or clusters within data. It's used to spot patterns and similarities among data points, making it useful for tasks like categorization and finding hidden structures in the data. \n\n Visualizations may employ colors or shapes to differentiate clusters, aiding in data exploration and analysis.",
    enable: false,
  },
  {
    image: OutliersImage,
    type: ChartTypes.outliers,
    description:
      "Aims to identify and highlight data points that significantly deviate from the majority. OutliersImage can be extreme values or anomalies that might carry special significance or require further investigation. \n\n Visualizations that emphasize outliers can assist in detecting errors, fraud, or unusual patterns in data.",
    enable: true,
  },
  {
    image: PathsImage,
    type: ChartTypes.paths,
    enable: false,
  },
  {
    image: TrendsImage,
    type: ChartTypes.trends,
    description:
      "Aims to visualize how data changes over time or across some other ordered dimension. \n\n Users can observe patterns, fluctuations, or long-term changes in data by focusing on this target",
    enable: true,
  },
  {
    image: RelationshipImage,
    type: ChartTypes.relationship,
    description:
      "Relationship or Part-to-whole relationship aims to explore the connections between multiple variables or dimensions in data. Visualizations for relationships help users understand how changes in one variable relate to changes in another. \n\n Analyzing relationships can uncover patterns, dependencies, or cause-and-effect relationships in data.",
    enable: true,
  },
  {
    image: TopologyImage,
    type: ChartTypes.topology,
    enable: false,
  },
];

const visualizations = [
  {
    image: BarChartImage,
    enable: true,
    type: VisualizationTypes.bar,
    filters: [ChartTypes.distribution],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 1,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      'Also known as Bar Graph or Column Graph. \n\n A Bar Chart uses either horizontal or vertical bars (column chart) to show discrete, numerical comparisons across categories. One axis of the chart shows the specific categories being compared and the other axis represents a discrete value scale. \n\n  Bar Charts are distinguished from Histograms, as they do not display continuous developments over an interval. Instead, Bar Chart\'s discrete data is categorical and therefore answers the question of "how many?" in each category.',
    description:
      "A bar chart is used to compare values across a few categories. Use it when the order of categories is not important.",
    imageDescription: BarChartDescriptionImage,
    imageFullDescription: BarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/bar_chart.html",
  },
  {
    image: ScatterPlotImage,
    enable: true,
    type: VisualizationTypes.dot,
    filters: [ChartTypes.trends, ChartTypes.outliers],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 1,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "A dot chart, also known as a dot plot, dot graph, or dot diagram, is a simple data visualization tool used to display the distribution or frequency of a dataset. It is particularly useful for visualizing categorical or discrete data, such as the distribution of values within a category or the occurrence of specific events. \n\n Dot charts are particularly useful for showing the distribution of data when you want to emphasize individual data points rather than connecting them with lines. They are often used in data analysis, statistics, and data visualization to provide a clear and concise representation of the dataset.",
    imageDescription: ScatterPlotDescriptionImage,
    imageFullDescription: ScatterPlotFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/scatterplot.html",
    description:
      "A dot chart is a visual representation using dots to show the distribution or frequency of data points in different categories or values.",
  },
  {
    image: GroupedBarChartImage,
    enable: true,
    type: VisualizationTypes.groupedBar,
    filters: [ChartTypes.trends, ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 2,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "Also known as a Grouped Bar Chart or Clustered Bar Chart. This variation of a Bar Chart can be used when two or more data series need to be plotted all on the same axis and grouped into parent categories. \n\n Like on a Bar Chart, the length of each bar on a Multiset Bar Chart is used to show discrete, numerical comparisons amongst categories. Each bar for a data series is assigned a colour to distinguish them apart. Bars in the same group are placed together and are then spaced apart from other bar groupings. \n\n The use of Multiset Bar Charts is usually to compare across categories that contain the same sub-categorical variables between them. Each bar is a subcategory that is grouped into a larger parent category. \n\n Multiset Bar Charts can also be used to compare mini Histograms to each other, so each bar in the group would represent the significant intervals of a variable. Another use could be to use Multiset Bar Charts to show data changing over time by having, for example, each bar represent a point in time such as a year. \n\n The downside of Multiset Bar Charts is that they become harder to read the more bars you have in one group. Therefore, you should try to limit the number of bars per group.",
    description:
      "Grouped bar chart is used to compare values across a few categories. Use it when the order of categories is not important.",
    imageDescription: GroupedBarChartDescriptionImage,
    imageFullDescription: GroupedBarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/multiset_barchart.html",
  },
  {
    image: LineChartImage,
    enable: true,
    type: VisualizationTypes.line,
    filters: [ChartTypes.trends],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 1,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "A line chart is used to display quantitative values over a continuous interval or time period. A Line Graph is most frequently used to show trends and analyse how the data has changed over time. \n\n Line Graphs are drawn by first plotting data points on a Cartesian coordinate grid, and then connecting a line between all of these points. Typically, the y-axis has a quantitative value, while the x-axis is a timescale or a sequence of intervals. Negative values can be displayed below the x-axis. \n\n  The direction of the lines on the graph works as a nice metaphor for the data: an upward slope indicates where values have increased and a downward slope indicates where values have decreased. The line's journey across the graph can create patterns that reveal trends in a dataset. \n\nWhen grouped with other lines (other data series), individual lines can be compared to one another. However, avoid using more than 3-4 lines per graph, as this makes the chart more cluttered and harder to read. A solution to this is to divide the chart into smaller multiples (have a small Line Graph for each data series).",
    description:
      "A line chart is used to display trends over time (years, months, and days) or categories when the order is important. Use it when there are many data points and the order is important.",
    imageDescription: LineChartDescriptionImage,
    imageFullDescription: LineChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/line_graph.html",
  },
  {
    image: PolarAreaChartImage,
    enable: true,
    type: VisualizationTypes.polar,
    filters: [ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 1,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "Also known as a Coxcomb Chart, Nightingale Rose Chart. \n\n This chart was famously used by statistician and medical reformer, Florence Nightingale to communicate the avoidable deaths of soldiers during the Crimean war. \n\n  Polar area charts are drawn on a polar coordinate grid. Each category or interval in the data is divided into equal segments on this radial chart. How far each segment extends from the centre of the polar axis depends on the value it represents. So each ring from the centre of the polar grid can be used as a scale to plot the segment size and represent a higher value. \n\n The major flaw with Nightingale Rose Charts is that the outer segments are emphasised more because of their larger area size, which disproportionately represents any value increases.",
    description:
      "The Polar Area chart is similar to a usual pie chart, except sectors are equal angles and differ rather in how far each sector extends from the center of the circle. The polar area diagram is used to plot cyclic phenomena (e.g., count of deaths by month).",
    imageDescription: PolarAreaChartDescriptionImage,
    imageFullDescription: PolarAreaChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/nightingale_rose_chart.html",
  },
  {
    image: PieChartImage,
    enable: true,
    type: VisualizationTypes.pie,
    filters: [ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 1,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "Extensively used in presentations and offices, Pie Charts help show proportions and percentages between categories, by dividing a circle into proportional segments. Each arc length represents a proportion of each category, while the full circle represents the total sum of all the data, equal to 100%. \n\n Pie Charts are ideal for giving the reader a quick idea of the proportional distribution of the data. However, the major downsides to pie charts are: \n\n  They cannot show more than a few values, because as the number of values shown increases, the size of each segment/slice becomes smaller. This makes them unsuitable for large datasets with many categories. \n\n They take up more space than their alternatives, for example, a 100% Stacked Bar Chart. Mainly due to their size and the usual need for a legend. \n\n They are not great for making accurate comparisons between groups of Pie Charts. This is because it is harder to distinguish the size of items via area when it is for length. \n\n Despite that, comparing a given category (one slice) within the total of a single Pie Chart, then it can often be more effective.",
    description:
      "A pie chart is used to show proportions of a whole. Use it to show numbers that relate to a larger sum and always equal to 100%. Do not use this chart if it contains many slices as angles are hard to estimate",
    imageDescription: PieChartDescriptionImage,
    imageFullDescription: PieChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/pie_chart.html",
  },
  {
    image: StackedBarChartImage,
    enable: true,
    type: VisualizationTypes.stackedBar,
    filters: [ChartTypes.trends, ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical.value,
        required: 2,
      },
      {
        type: DataTypes.numerical.value,
        required: 1,
      },
      {
        type: DataTypes.catOrdered.value,
        required: 0,
      },
    ],
    fullDescription:
      "Stacked Bar Graphs segment the bars on top of each other. They are used to show how a larger category is divided into smaller subcategories and what the relationship of each part has on the total amount. There are two types of Stacked Bar Graphs: \n\n Simple Stacked Bar charts place each value for the segment after the previous one. The total value of the bar is all the segment values added together. Ideal for comparing the total amounts across each segmented bar. \n\n 100% Stack Bar Graphs show the percentage-of-the-whole by plotting the percentage of each value to the total amount in each group. This makes it easier to see the relative differences between quantities in each group. \n\n One major flaw of Stacked Bar Graphs is that they become harder to read the more segments each bar has. Also, comparing each segment to the other is difficult, as they're not aligned on a common baseline.",
    description:
      "Stacked bar chart is used to compare values across a few categories. Use it when the order of categories is not important.",
    imageDescription: StackedBarChartDescriptionImage,
    imageFullDescription: StackedBarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/stacked_bar_graph.html",
  },
];

export {
  DataTypes,
  visualizations,
  VisualizationTypes,
  ChartTypes,
  chartFilters,
};
