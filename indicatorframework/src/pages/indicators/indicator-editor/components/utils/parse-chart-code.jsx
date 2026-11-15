/** Dependency declarations are metadata; generated fragments contain chart markup and inline code only. */
export default function parseChartCode(encoded, visualizationTypeId) {
  const template = document.createElement("template");
  template.innerHTML = decodeURIComponent(encoded);
  const scripts = [...template.content.querySelectorAll("script")];
  if (scripts.some((script) => script.hasAttribute("src"))) {
    throw new Error("Declare browser libraries in the visualization plugin manifest.");
  }
  const scriptData = scripts.map((script) => script.textContent).join("\n");
  scripts.forEach((script) => script.remove());
  const html = template.innerHTML;
  return { html, scriptData, visualizationTypeId, displayCode: [<span key="chart-markup" dangerouslySetInnerHTML={{ __html: html }} />] };
}
