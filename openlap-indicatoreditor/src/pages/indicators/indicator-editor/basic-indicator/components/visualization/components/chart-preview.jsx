import React, { useContext, useEffect, useRef, useState } from "react";
import { BasicContext } from "../../../basic-indicator";
import { Box } from "@mui/material";

const ChartPreview = () => {
  const { visualization, setVisualization } = useContext(BasicContext);
  const [state, setState] = useState();
  const firstCode = visualization?.previewData?.displayCode?.[0];

  if (!firstCode) return null;

  const scriptRef = useRef(null);

  useEffect(() => {
    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.innerHTML = visualization.previewData.scriptData;
      document.getElementById("root").appendChild(script);
      scriptRef.current = script;
    } else {
      scriptRef.current.innerHTML = visualization.previewData.scriptData;
    }

    return () => {
      if (scriptRef.current) {
        document.getElementById("root").removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [visualization.previewData.scriptData]);

  return (
    <>
      {
        React.isValidElement(firstCode) ? (
          firstCode // render element as-is
        ) : typeof firstCode === "string" ? (
          <span dangerouslySetInnerHTML={{ __html: firstCode }} />
        ) : null // skip if it's some unexpected object
      }
    </>
  );
};

export default ChartPreview;
