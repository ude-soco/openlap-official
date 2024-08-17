import BarChart from "../../../../assets/images/isc_charts/bar_graph.svg";
import BarChartDesc from "../../../../assets/images/isc_charts_description/bar_chart.png";
import BarChartDescLong from "../../../../assets/images/isc_charts_description/bar_chart_desc.png";

import Scatterplot from "../../../../assets/images/isc_charts/scatterplot.svg";
import ScatterplotDesc from "../../../../assets/images/isc_charts_description/scatterplot.png";
import ScatterplotDescLong from "../../../../assets/images/isc_charts_description/scatterplot_desc.png";

import LineChart from "../../../../assets/images/isc_charts/line_graph.svg";
import LineChartDesc from "../../../../assets/images/isc_charts_description/line_graph.png";
import LineChartDescLong from "../../../../assets/images/isc_charts_description/line_graph_desc.png";

import PolarAreaChart from "../../../../assets/images/isc_charts/polar_area_chart.svg";
import PolarAreaChartDesc from "../../../../assets/images/isc_charts_description/polar_area_chart.svg";
import PolarAreaChartDescLong from "../../../../assets/images/isc_charts_description/polar_area_chart_desc.svg";

import PieChart from "../../../../assets/images/isc_charts/pie_chart.svg";
import PieChartDesc from "../../../../assets/images/isc_charts_description/pie_chart.png";
import PieChartDescLong from "../../../../assets/images/isc_charts_description/pie_chart_desc.png";

import StackedBarChart from "../../../../assets/images/isc_charts/stacked_bar_graph.svg";
import StackedBarChartDesc from "../../../../assets/images/isc_charts_description/stacked_bar_graph.png";
import StackedBarChartDescLong from "../../../../assets/images/isc_charts_description/stacked_bar_graph_desc.png";

import GroupedBarChart from "../../../../assets/images/isc_charts/grouped_bar_chart.svg";
import GroupedBarChartDesc from "../../../../assets/images/isc_charts_description/grouped_bar_chart.png";
import GroupedBarChartDescLong from "../../../../assets/images/isc_charts_description/grouped_bar_chart_desc.png";

const chartTypes = [
  {
    image: BarChart,
    code: "bar",
    name: "Bar chart",
    types: ["Distribution"],
    Categorical: 1,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      'Also known as Bar Graph or Column Graph. \n\n A Bar Chart uses either horizontal or vertical bars (column chart) to show discrete, numerical comparisons across categories. One axis of the chart shows the specific categories being compared and the other axis represents a discrete value scale. \n\n  Bar Charts are distinguished from Histograms, as they do not display continuous developments over an interval. Instead, Bar Chart\'s discrete data is categorical and therefore answers the question of "how many?" in each category.',
    shortDesc:
      "A bar chart is used to compare values across a few categories. Use it when the order of categories is not important.",
    descImg1: BarChartDesc,
    descImg2: BarChartDescLong,
    link: "https://datavizcatalogue.com/methods/bar_chart.html",
  },
  // {
  //   image: BoxPlot,
  //   code: "box",
  //   name: "Box plot",
  //   types: ["Distribution"],
  //   link: "https://datavizcatalogue.com/methods/box_plot.html"
  // },
  {
    image: Scatterplot,
    code: "dot",
    name: "Dot chart",
    types: ["Trends", "Outliers"],
    Categorical: 1,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "A dot chart, also known as a dot plot, dot graph, or dot diagram, is a simple data visualization tool used to display the distribution or frequency of a dataset. It is particularly useful for visualizing categorical or discrete data, such as the distribution of values within a category or the occurrence of specific events. \n\n Dot charts are particularly useful for showing the distribution of data when you want to emphasize individual data points rather than connecting them with lines. They are often used in data analysis, statistics, and data visualization to provide a clear and concise representation of the dataset.",
    descImg1: ScatterplotDesc,
    descImg2: ScatterplotDescLong,
    link: "https://datavizcatalogue.com/methods/scatterplot.html",
    shortDesc:
      "A dot chart is a visual representation using dots to show the distribution or frequency of data points in different categories or values.",
  },

  {
    image: GroupedBarChart,
    code: "grouped-bar",
    name: "Grouped bar chart",
    types: ["Trends", "Part-to-whole relationship"],
    Categorical: 2,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "Also known as a Grouped Bar Chart or Clustered Bar Chart. This variation of a Bar Chart can be used when two or more data series need to be plotted all on the same axis and grouped into parent categories. \n\n Like on a Bar Chart, the length of each bar on a Multiset Bar Chart is used to show discrete, numerical comparisons amongst categories. Each bar for a data series is assigned a colour to distinguish them apart. Bars in the same group are placed together and are then spaced apart from other bar groupings. \n\n The use of Multiset Bar Charts is usually to compare across categories that contain the same sub-categorical variables between them. Each bar is a subcategory that is grouped into a larger parent category. \n\n Multiset Bar Charts can also be used to compare mini Histograms to each other, so each bar in the group would represent the significant intervals of a variable. Another use could be to use Multiset Bar Charts to show data changing over time by having, for example, each bar represent a point in time such as a year. \n\n The downside of Multiset Bar Charts is that they become harder to read the more bars you have in one group. Therefore, you should try to limit the number of bars per group.",
    shortDesc:
      "Grouped bar chart is used to compare values accross a few categories. Use it when the order of categories is not important.",
    descImg1: GroupedBarChartDesc,
    descImg2: GroupedBarChartDescLong,
    link: "https://datavizcatalogue.com/methods/multiset_barchart.html",
  },
  // {
  //   image: Heatmap,
  //   code: "heatmap",
  //   name: "Heatmap",
  //   types: ["Outliers", "Features"],
  //   Categorical: 2,
  //   Numerical: 1,
  //   description:
  //     "Heatmaps visualise data through variations in colouring. When applied to a tabular format, Heatmaps are useful for cross-examining multivariate data, through placing variables in the rows and columns and colouring the cells within the table. Heatmaps are good for showing variance across multiple variables, revealing any patterns, displaying whether any variables are similar to each other, and for detecting if any correlations exist. \n\n Typically, all the rows are one category (labels displayed on the left or right side) and all the columns are another category (labels displayed on the top or bottom). The individual rows and columns are divided into the subcategories, which all match up with each other in a matrix. The cells are the intersections of the rows and columns, which can either contain categorical data or numerical data. \n\n  A legend is required alongside a Heatmap in order for it to be successfully read. Categorical data is colour-coded, while numerical data requires a colour scale that blends from one colour to another, in order to represent the difference in high and low values. A selection of solid colours can be used to represent multiple value ranges (0-10, 11-20, 21-30, etc) or you can use a gradient scale for a single range (for example 0 - 100) by blending two or more colours together. \n\n Because of their reliance on colour to communicate values, Heatmaps are a chart better suited to displaying a more generalised view of numerical data, as it’s harder to accurately tell the differences between colour shades and to extract specific data points from. However, this problem can be remedied by displaying the data values inside the cells. \n\n Heatmaps can also be used to show the changes in data over time if one of the rows or columns are set to time intervals. An example of this would be to use a Heatmap to compare the temperature changes across the year in multiple cities, to see where’s the hottest or coldest places. So the rows could list the cities to compare, the columns contain each month and the cells would contain the temperature values.",
  //   descImg1: "/img/isc_charts_description/heatmap.svg",
  //   descImg2: "/img/isc_charts_description/heatmap_desc.svg",
  //   link:"https://datavizcatalogue.com/methods/heatmap.html"
  // },
  // {
  //   image: Histogram,
  //   code: "histogram",
  //   name: "Histogram",
  //   types: ["Distribution"],
  //   Categorical: 0,
  //   Numerical: 2,
  //   "Categorical (ordinal)": 0,
  //   description:
  //     "A Histogram visualises the distribution of data over a continuous interval. Each bar in a histogram represents the tabulated frequency at each interval/bin. \n\n Histograms help give an estimate as to where values are concentrated, what the extremes are and whether there are any gaps or unusual values. They are also useful for giving a rough view of the probability distribution.",
  //   shortDesc:
  //     "A Histogram visualises the distribution of data over a continuous interval",
  //   descImg1: HistogramDesc,
  //   descImg2: HistogramDesc2,
  //   link:"https://datavizcatalogue.com/methods/histogram.html"
  // },
  {
    image: LineChart,
    code: "line",
    name: "Line chart",
    types: ["Trends"],
    Categorical: 1,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "A line chart is used to display quantitative values over a continuous interval or time period. A Line Graph is most frequently used to show trends and analyse how the data has changed over time. \n\n Line Graphs are drawn by first plotting data points on a Cartesian coordinate grid, and then connecting a line between all of these points. Typically, the y-axis has a quantitative value, while the x-axis is a timescale or a sequence of intervals. Negative values can be displayed below the x-axis. \n\n  The direction of the lines on the graph works as a nice metaphor for the data: an upward slope indicates where values have increased and a downward slope indicates where values have decreased. The line's journey across the graph can create patterns that reveal trends in a dataset. \n\nWhen grouped with other lines (other data series), individual lines can be compared to one another. However, avoid using more than 3-4 lines per graph, as this makes the chart more cluttered and harder to read. A solution to this is to divide the chart into smaller multiples (have a small Line Graph for each data series).",
    shortDesc:
      "A line chart is used to display trends over time (years, months, and days) or categories when the order is important. Use it when there are many data points and the order is important.",
    descImg1: LineChartDesc,
    descImg2: LineChartDescLong,
    link: "https://datavizcatalogue.com/methods/line_graph.html",
  },
  {
    image: PolarAreaChart,
    code: "polar-area",
    name: "Polar area chart",
    types: ["Part-to-whole relationship"],
    Categorical: 1,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "Also known as a Coxcomb Chart, Nightingale Rose Chart. \n\n This chart was famously used by statistician and medical reformer, Florence Nightingale to communicate the avoidable deaths of soldiers during the Crimean war. \n\n  Polar area charts are drawn on a polar coordinate grid. Each category or interval in the data is divided into equal segments on this radial chart. How far each segment extends from the centre of the polar axis depends on the value it represents. So each ring from the centre of the polar grid can be used as a scale to plot the segment size and represent a higher value. \n\n The major flaw with Nightingale Rose Charts is that the outer segments are emphasised more because of their larger area size, which disproportionately represents any value increases.",
    shortDesc:
      "The Polar Area chart is similar to a usual pie chart, except sectors are equal angles and differ rather in how far each sector extends from the center of the circle. The polar area diagram is used to plot cyclic phenomena (e.g., count of deaths by month).",
    descImg1: PolarAreaChartDesc,
    descImg2: PolarAreaChartDescLong,
    link: "https://datavizcatalogue.com/methods/nightingale_rose_chart.html",
  },
  // {
  //   image: "/img/isc_charts/parallel_coordinates.svg",
  //   name: "Parallel coordinates",
  //   types: ["Outliers", "Trends", "Correlation"],
  // },
  {
    image: PieChart,
    code: "pie",
    name: "Pie chart",
    types: ["Part-to-whole relationship"],
    Categorical: 1,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "Extensively used in presentations and offices, Pie Charts help show proportions and percentages between categories, by dividing a circle into proportional segments. Each arc length represents a proportion of each category, while the full circle represents the total sum of all the data, equal to 100%. \n\n Pie Charts are ideal for giving the reader a quick idea of the proportional distribution of the data. However, the major downsides to pie charts are: \n\n  They cannot show more than a few values, because as the number of values shown increases, the size of each segment/slice becomes smaller. This makes them unsuitable for large datasets with many categories. \n\n They take up more space than their alternatives, for example, a 100% Stacked Bar Chart. Mainly due to their size and the usual need for a legend. \n\n They are not great for making accurate comparisons between groups of Pie Charts. This is because it is harder to distinguish the size of items via area when it is for length. \n\n Despite that, comparing a given category (one slice) within the total of a single Pie Chart, then it can often be more effective.",
    shortDesc:
      "A pie chart is used to show proportions of a whole. Use it to show numbers that relate to a larger sum and always equal to 100%. Do not use this chart if it contains many slices as angles are hard to estimate",
    descImg1: PieChartDesc,
    descImg2: PieChartDescLong,
    link: "https://datavizcatalogue.com/methods/pie_chart.html",
  },
  // {
  //   image: Scatterplot,
  //   code: "scatter-plot",
  //   name: "Scatterplot",
  //   types: ["Trends", "Outliers", "Distribution", "Correlation", "Cluster"],
  //   Categorical: 0,
  //   Numerical: 2,
  //   "Categorical (ordinal)": 0,
  //   description:
  //     "Also known as a Scatter Graph, Point Graph, X-Y Plot, Scatter Chart or Scattergram. \n\n A Scatterplot places points on a Cartesian Coordinates system to display all the values between two variables. By having an axis for each variable, you can detect if a relationship or correlation between the two exists. \n\n  The kind of correlation can be interpreted through the patterns revealed on a Scatterplot. These are: positive (values increase together), negative (one value decreases as the other increases) or null (no correlation). The shape of the correlation can be described as: linear, exponential and U-shaped. The strength of the correlation can be determined by how closely packed the points are to each other on the graph. Points that end up far outside the general cluster of points are known as outliers. \n\n Lines or curves can be displayed over the graph to aid in the analysis. This is typically known as the Line of Best Fit or Trend Line and can be used to make estimates via interpolation. A Line of Best Fit is drawn as close to all the points as possible to show how it would look if all the points were condensed together into a single line. \n\n Scatterplots are ideal when you have paired numerical data and you want to see if one variable impacts the other. However, do remember that correlation is not causation and another unnoticed or indirect variable may be influencing the results.",
  //   shortDesc:
  //     "A scatterplot is used to compare at least two sets of values or pairs of data. Use it to show relationships between sets of values",
  //   descImg1: ScatterplotDesc,
  //   descImg2: ScatterplotDescLong,
  //   link: "https://datavizcatalogue.com/methods/scatterplot.html",
  // },
  {
    image: StackedBarChart,
    code: "stacked-bar",
    name: "Stacked bar chart",
    types: ["Trends", "Part-to-whole relationship"],
    Categorical: 2,
    Numerical: 1,
    "Categorical (ordinal)": 0,
    description:
      "Stacked Bar Graphs segment the bars on top of each other. They are used to show how a larger category is divided into smaller subcategories and what the relationship of each part has on the total amount. There are two types of Stacked Bar Graphs: \n\n Simple Stacked Bar charts place each value for the segment after the previous one. The total value of the bar is all the segment values added together. Ideal for comparing the total amounts across each segmented bar. \n\n 100% Stack Bar Graphs show the percentage-of-the-whole by plotting the percentage of each value to the total amount in each group. This makes it easier to see the relative differences between quantities in each group. \n\n One major flaw of Stacked Bar Graphs is that they become harder to read the more segments each bar has. Also, comparing each segment to the other is difficult, as they're not aligned on a common baseline.",
    shortDesc:
      "Stacked bar chart is used to compare values accross a few categories. Use it when the order of categories is not important.",
    descImg1: StackedBarChartDesc,
    descImg2: StackedBarChartDescLong,
    link: "https://datavizcatalogue.com/methods/stacked_bar_graph.html",
  },
  // {
  //   image: Treemap,
  //   code: "treemap",
  //   name: "Treemap",
  //   types: ["Part-to-whole relationship"],
  //   link: "https://datavizcatalogue.com/methods/treemap.html"
  // },
];

export default chartTypes;
