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
import TreeMapImage from "../../../../../assets/images/isc_charts/treemap.svg";
import TreeMapDescriptionImage from "../../../../../assets/images/isc_charts_description/treemap.png";
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
import RadarImage from "../../../../../assets/images/isc_charts/radar_chart.svg";
import RadarDescriptionImage from "../../../../../assets/images/isc_charts_description/radar_chart.png";

const DataTypes = {
  categorical: {
    value: "Categorical",
    type: "string",
    description:
      "Groups information into specific categories or labels without any order or ranking. For example, colors like red, blue, and green are categories.",
  },
  numerical: {
    value: "Numerical",
    type: "number",
    description:
      "Uses numbers to describe things like age, height, or income that can be counted or measured.",
  },
  catOrdered: {
    value: "Categorical (ordinal)",
    type: "string",
    description:
      "Groups information into categories that have a specific order. For example, temperature can be categorized as low, medium, or high.",
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
  treemap: "Tree Map",
  radar: "Radar Chart",
};

const chartFilters = [
  {
    image: DistributionImage,
    type: ChartTypes.distribution,
    description:
      "Distribution shows how data points are spread out across different values or categories, helping to see patterns like whether data is evenly spread or clustered.",
    enable: true,
  },
  {
    image: ClusterImage,
    type: ChartTypes.cluster,
    description:
      "Clustering groups similar data points together, making it easier to spot patterns and natural groupings within the data.",
    enable: false,
  },
  {
    image: OutliersImage,
    type: ChartTypes.outliers,
    description:
      "Outliers are data points that stand out because they are much different from the rest, possibly indicating errors or unusual patterns.",
    enable: true,
  },
  {
    image: PathsImage,
    type: ChartTypes.paths,
    description:
      "Paths trace the route or sequence between different points, showing how they are connected or related to each other.",
    enable: false,
  },
  {
    image: TrendsImage,
    type: ChartTypes.trends,
    description:
      "Trends show how data changes over time or in a sequence, helping to identify patterns and shifts.",
    enable: true,
  },
  {
    image: RelationshipImage,
    type: ChartTypes.relationship,
    description:
      "This shows how different parts contribute to a whole, helping to understand the connections and relationships between variables.",
    enable: true,
  },
  {
    image: TopologyImage,
    type: ChartTypes.topology,
    description:
      "Topology describes the overall structure and arrangement of connections or relationships within a set of points or elements, focusing on how they are linked, regardless of distance or direction.",
    enable: false,
  },
];

const visualizations = [
  {
    image: BarChartImage,
    enable: true,
    type: VisualizationTypes.bar,
    code: "bar",
    filters: [ChartTypes.distribution],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      'Also known as Bar Graph or Column Graph. \n\n A Bar Chart uses either horizontal or vertical bars (column chart) to show discrete, numerical comparisons across categories. One axis of the chart shows the specific categories being compared and the other axis represents a discrete value scale. \n\n  Bar Charts are distinguished from Histograms, as they do not display continuous developments over an interval. Instead, Bar Chart\'s discrete data is categorical and therefore answers the question of "how many?" in each category.',
    description:
      "A bar chart uses rectangular bars to compare values across different categories, with bar height or length representing the data's value.",
    imageDescription: BarChartDescriptionImage,
    imageFullDescription: BarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/bar_chart.html",
  },
  {
    image: ScatterPlotImage,
    enable: true,
    type: VisualizationTypes.dot,
    code: "scatter",
    filters: [ChartTypes.trends],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 0,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 1,
      },
    ],
    fullDescription:
      "A scatter plot chart, also known as a dot plot, dot graph, or dot diagram, is a simple data visualization tool used to display the distribution or frequency of a dataset. It is particularly useful for visualizing categorical or discrete data, such as the distribution of values within a category or the occurrence of specific events. \n\n Dot charts are particularly useful for showing the distribution of data when you want to emphasize individual data points rather than connecting them with lines. They are often used in data analysis, statistics, and data visualization to provide a clear and concise representation of the dataset.",
    imageDescription: ScatterPlotDescriptionImage,
    imageFullDescription: ScatterPlotFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/scatterplot.html",
    description:
      "A dot plot is a simple, effective data visualization tool that uses dots to represent individual data points, allowing for easy identification of data distributions and trends.",
  },
  {
    image: ScatterPlotImage,
    enable: true,
    type: VisualizationTypes.scatter,
    code: "scatter",
    filters: [ChartTypes.trends],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 2,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      "A scatter plot chart, also known as a dot plot, dot graph, or dot diagram, is a simple data visualization tool used to display the distribution or frequency of a dataset. It is particularly useful for visualizing categorical or discrete data, such as the distribution of values within a category or the occurrence of specific events. \n\n Dot charts are particularly useful for showing the distribution of data when you want to emphasize individual data points rather than connecting them with lines. They are often used in data analysis, statistics, and data visualization to provide a clear and concise representation of the dataset.",
    imageDescription: ScatterPlotDescriptionImage,
    imageFullDescription: ScatterPlotFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/scatterplot.html",
    description:
      "A scatter plot displays individual data points on a grid, showing the relationship between two variables along the x and y axes.",
  },
  {
    image: GroupedBarChartImage,
    enable: true,
    type: VisualizationTypes.groupedBar,
    code: "bar",
    filters: [ChartTypes.trends, ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 2,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      "Also known as a Grouped Bar Chart or Clustered Bar Chart. This variation of a Bar Chart can be used when two or more data series need to be plotted all on the same axis and grouped into parent categories. \n\n Like on a Bar Chart, the length of each bar on a Multiset Bar Chart is used to show discrete, numerical comparisons amongst categories. Each bar for a data series is assigned a colour to distinguish them apart. Bars in the same group are placed together and are then spaced apart from other bar groupings. \n\n The use of Multiset Bar Charts is usually to compare across categories that contain the same sub-categorical variables between them. Each bar is a subcategory that is grouped into a larger parent category. \n\n Multiset Bar Charts can also be used to compare mini Histograms to each other, so each bar in the group would represent the significant intervals of a variable. Another use could be to use Multiset Bar Charts to show data changing over time by having, for example, each bar represent a point in time such as a year. \n\n The downside of Multiset Bar Charts is that they become harder to read the more bars you have in one group. Therefore, you should try to limit the number of bars per group.",
    description:
      "Another variant of bar chart is a grouped bar chart. It compares multiple categories across different groups using clusters of bars for each group.",
    imageDescription: GroupedBarChartDescriptionImage,
    imageFullDescription: GroupedBarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/multiset_barchart.html",
  },
  {
    image: LineChartImage,
    enable: true,
    type: VisualizationTypes.line,
    code: "line",
    filters: [ChartTypes.trends],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 0,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 1,
      },
    ],
    fullDescription:
      "A line chart is used to display quantitative values over a continuous interval or time period. A Line Graph is most frequently used to show trends and analyse how the data has changed over time. \n\n Line Graphs are drawn by first plotting data points on a Cartesian coordinate grid, and then connecting a line between all of these points. Typically, the y-axis has a quantitative value, while the x-axis is a timescale or a sequence of intervals. Negative values can be displayed below the x-axis. \n\n  The direction of the lines on the graph works as a nice metaphor for the data: an upward slope indicates where values have increased and a downward slope indicates where values have decreased. The line's journey across the graph can create patterns that reveal trends in a dataset. \n\nWhen grouped with other lines (other data series), individual lines can be compared to one another. However, avoid using more than 3-4 lines per graph, as this makes the chart more cluttered and harder to read. A solution to this is to divide the chart into smaller multiples (have a small Line Graph for each data series).",
    description:
      "A line chart shows data trends over time by connecting individual data points with a continuous line.",
    imageDescription: LineChartDescriptionImage,
    imageFullDescription: LineChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/line_graph.html",
  },
  {
    image: PolarAreaChartImage,
    enable: true,
    type: VisualizationTypes.polar,
    code: "polarArea",
    filters: [ChartTypes.distribution],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      "Also known as a Coxcomb Chart, Nightingale Rose Chart. \n\n This chart was famously used by statistician and medical reformer, Florence Nightingale to communicate the avoidable deaths of soldiers during the Crimean war. \n\n  Polar area charts are drawn on a polar coordinate grid. Each category or interval in the data is divided into equal segments on this radial chart. How far each segment extends from the centre of the polar axis depends on the value it represents. So each ring from the centre of the polar grid can be used as a scale to plot the segment size and represent a higher value. \n\n The major flaw with Nightingale Rose Charts is that the outer segments are emphasised more because of their larger area size, which disproportionately represents any value increases.",
    description:
      "The Polar Area chart displays data in a circular format, with segments representing values at different angles from the center.",
    imageDescription: PolarAreaChartDescriptionImage,
    imageFullDescription: PolarAreaChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/nightingale_rose_chart.html",
  },
  {
    image: PieChartImage,
    enable: true,
    type: VisualizationTypes.pie,
    code: "pie",
    filters: [ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      "Extensively used in presentations and offices, Pie Charts help show proportions and percentages between categories, by dividing a circle into proportional segments. Each arc length represents a proportion of each category, while the full circle represents the total sum of all the data, equal to 100%. \n\n Pie Charts are ideal for giving the reader a quick idea of the proportional distribution of the data. However, the major downsides to pie charts are: \n\n  They cannot show more than a few values, because as the number of values shown increases, the size of each segment/slice becomes smaller. This makes them unsuitable for large datasets with many categories. \n\n They take up more space than their alternatives, for example, a 100% Stacked Bar Chart. Mainly due to their size and the usual need for a legend. \n\n They are not great for making accurate comparisons between groups of Pie Charts. This is because it is harder to distinguish the size of items via area when it is for length. \n\n Despite that, comparing a given category (one slice) within the total of a single Pie Chart, then it can often be more effective.",
    description:
      "A pie chart represents parts of a whole with slices, where each slice's size indicates its proportion of the total.",
    imageDescription: PieChartDescriptionImage,
    imageFullDescription: PieChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/pie_chart.html",
  },
  {
    image: StackedBarChartImage,
    enable: true,
    type: VisualizationTypes.stackedBar,
    code: "bar",
    filters: [ChartTypes.trends, ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 2,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    fullDescription:
      "Stacked Bar Graphs segment the bars on top of each other. They are used to show how a larger category is divided into smaller subcategories and what the relationship of each part has on the total amount. There are two types of Stacked Bar Graphs: \n\n Simple Stacked Bar charts place each value for the segment after the previous one. The total value of the bar is all the segment values added together. Ideal for comparing the total amounts across each segmented bar. \n\n 100% Stack Bar Graphs show the percentage-of-the-whole by plotting the percentage of each value to the total amount in each group. This makes it easier to see the relative differences between quantities in each group. \n\n One major flaw of Stacked Bar Graphs is that they become harder to read the more segments each bar has. Also, comparing each segment to the other is difficult, as they're not aligned on a common baseline.",
    description:
      "A Stacked Bar visualizes the composition of categories by stacking segments on top of each other within bars, showing both total and individual category contributions.",
    imageDescription: StackedBarChartDescriptionImage,
    imageFullDescription: StackedBarChartFullDescriptionImage,
    link: "https://datavizcatalogue.com/methods/stacked_bar_graph.html",
  },
  {
    image: TreeMapImage,
    enable: true,
    type: VisualizationTypes.treemap,
    code: "treemap",
    filters: [ChartTypes.relationship],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 2,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    imageDescription: TreeMapDescriptionImage,
    description:
      "A treemap is a data visualization technique that displays hierarchical data through a series of nested rectangles, where the size of each rectangle corresponds to the value of the data it represents, and the structure of these rectangles reflects the hierarchy of the data.",
    link: "https://datavizcatalogue.com/methods/treemap.html",
  },
  {
    image: RadarImage,
    enable: true,
    type: VisualizationTypes.radar,
    code: "radar",
    filters: [ChartTypes.distribution],
    dataTypes: [
      {
        type: DataTypes.categorical,
        required: 1,
      },
      {
        type: DataTypes.numerical,
        required: 1,
      },
      {
        type: DataTypes.catOrdered,
        required: 0,
      },
    ],
    imageDescription: RadarDescriptionImage,
    description:
      "A radar chart, also known as a spider chart, web chart, polar chart, or star plot, is a graphical method of displaying multivariate data in the form of a two-dimensional chart of three or more quantitative variables represented on axes starting from the same point. The relative position and angle of the axes is typically uninformative, but various heuristics, such as algorithms developed by statisticians, might be applied to optimize the positions (e.g., to minimize overlap).",
    link: "https://datavizcatalogue.com/methods/treemap.html",
  },
];

export {
  DataTypes,
  visualizations,
  VisualizationTypes,
  ChartTypes,
  chartFilters,
};
