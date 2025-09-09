import React, { useEffect, useRef } from "react";
import { Grid } from "@mui/material";

const ChartPreview = ({ previewData }) => {
  const firstCode = previewData?.displayCode?.[0];

  if (!firstCode) return null;

  const scriptRef = useRef(null);

  useEffect(() => {
    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.innerHTML = previewData.scriptData;
      document.getElementById("root").appendChild(script);
      scriptRef.current = script;
    } else {
      scriptRef.current.innerHTML = previewData.scriptData;
    }

    return () => {
      if (scriptRef.current) {
        document.getElementById("root").removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [previewData.scriptData]);

  return (
    <Grid
      container
      justifyContent="center"
      sx={{ backgroundColor: "white", p: 3 }}
    >
      {React.isValidElement(firstCode) ? (
        firstCode
      ) : typeof firstCode === "string" ? (
        <span dangerouslySetInnerHTML={{ __html: firstCode }} />
      ) : null}
    </Grid>
  );
};

export default ChartPreview;
