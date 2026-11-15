import { useLayoutEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, LinearProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Chart from "react-apexcharts";

/** A dialog has its own width: never infer it from the window or a previous chart. */
export default function CommunityIscPreview({ visRef }) {
  const container = useRef(null);
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const height = 360;
  useLayoutEffect(() => {
    const element = container.current;
    const measure = () => setWidth((previous) => {
      const next = Math.floor(element.clientWidth);
      return next > 0 ? next : previous;
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const options = useMemo(() => {
    const original = visRef.data.options;
    return { ...original, chart: { ...original.chart,
      type: visRef.chart.code, width, height, parentHeightOffset: 0,
      foreColor: theme.palette.text.primary,
      // React owns measured dimensions. A second window/parent resize handler
      // can otherwise keep the desktop plot width after the dialog becomes mobile.
      redrawOnParentResize: false, redrawOnWindowResize: false,
      animations: { enabled: false }, toolbar: { show: false },
    } };
  }, [visRef, width, theme.palette.text.primary]);

  return <Box component="figure" aria-label="Illustrative community chart" ref={container}
    sx={{ m: 0, minWidth: 0, width: "100%", height, "& .apexcharts-canvas": { maxWidth: "100%" } }}>
    {width > 0 ? <Chart key={visRef.chart.code} options={options} series={visRef.data.series}
      type={visRef.chart.code} width={width} height={height} />
      : <LinearProgress aria-label="Measuring illustrative chart" />}
  </Box>;
}
CommunityIscPreview.propTypes = { visRef: PropTypes.shape({
  chart: PropTypes.shape({ code: PropTypes.string.isRequired }).isRequired,
  data: PropTypes.shape({ options: PropTypes.object.isRequired, series: PropTypes.array.isRequired }).isRequired,
}).isRequired };
