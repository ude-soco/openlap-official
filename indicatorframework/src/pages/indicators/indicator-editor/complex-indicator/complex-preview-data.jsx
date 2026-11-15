import parse from "html-react-parser";

export default function chartPreviewData(code) {
  const elements = parse(decodeURIComponent(code));
  const nodes = Array.isArray(elements) ? elements : [elements];
  return {
    displayCode: [
      <span key="complex-chart-markup">
        {nodes.filter((node) => node?.type !== "script")}
      </span>,
    ],
    scriptData: nodes
      .filter((node) => node?.type === "script")
      .map((node) => node.props?.dangerouslySetInnerHTML?.__html || "")
      .join("\n"),
  };
}
