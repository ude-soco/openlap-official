const handleDisplayType = (indicatorType) => {
  let text;
  switch (indicatorType) {
    case "BASIC":
      text = "Basic Indicator";
      break;
    case "COMPOSITE":
      text = "Composite Indicator";
      break;
    case "MULTI_LEVEL":
      text = "Multi-level Analysis Indicator";
      break;
    default:
      text = "Unknown";
  }
  return text;
};

export { handleDisplayType };
