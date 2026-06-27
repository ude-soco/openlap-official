import { useContext } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Link,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { ISCContext } from "../../../../isc-context.js";
import { getChartCompatibility } from "../../utils/chart-compatibility.js";
import { CHART_GUIDANCE } from "../../utils/visualization-copy.js";

// One explanation line: an icon (not color-only) + readable text.
const ReasonRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon
        fontSize="small"
        color="success"
        sx={{ mt: "2px" }}
      />
    ) : (
      <ReportProblemOutlinedIcon
        fontSize="small"
        color="warning"
        sx={{ mt: "2px" }}
      />
    )}
    <Typography variant="body2">{children}</Typography>
  </Stack>
);

ReasonRow.propTypes = { ok: PropTypes.bool, children: PropTypes.node };

const VisualizationDescription = ({ columnError }) => {
  const { visRef, dataset } = useContext(ISCContext);
  const chart = visRef.chart;
  const guidance = CHART_GUIDANCE[chart.type];

  const compatibility = getChartCompatibility(chart, dataset.columns);
  const matchesTask =
    Boolean(visRef.filter.type) &&
    (chart.filters || []).includes(visRef.filter.type);
  const recommended =
    compatibility.compatible && (matchesTask || !visRef.filter.type);
  const status = !compatibility.compatible
    ? "incompatible"
    : recommended
      ? "recommended"
      : "alternative";

  const statusChip = {
    recommended: { label: "Recommended", color: "success", variant: "filled" },
    alternative: { label: "Alternative", color: "success", variant: "outlined" },
    incompatible: {
      label: "Requires more data",
      color: "warning",
      variant: "outlined",
    },
  }[status];

  const whyHeading = {
    recommended: "Why we recommend this chart",
    alternative: "Why this is an alternative",
    incompatible: "Requires additional data",
  }[status];

  return (
    <Stack gap={3}>
      {/* Title + recommendation status */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h6" component="h3">
          {chart.type}
        </Typography>
        <Chip
          size="small"
          color={statusChip.color}
          variant={statusChip.variant}
          label={statusChip.label}
        />
      </Stack>

      {/* Why we recommend / Requires additional data */}
      <Box>
        <Typography variant="subtitle2" component="h4" gutterBottom>
          {whyHeading}
        </Typography>
        <Stack gap={0.75}>
          {status === "incompatible"
            ? compatibility.missing.map((m) => (
                <ReasonRow key={m.type} ok={false}>
                  Requires {m.required} {m.type.toLowerCase()} column
                  {m.required > 1 ? "s" : ""} (you have {m.available}).
                </ReasonRow>
              ))
            : [
                matchesTask && (
                  <ReasonRow key="task" ok>
                    Your selected task is <b>{visRef.filter.type}</b>.
                  </ReasonRow>
                ),
                ...compatibility.matched.map((m) => (
                  <ReasonRow key={m.type} ok>
                    Your data provides {m.available} {m.type.toLowerCase()}{" "}
                    column{m.available > 1 ? "s" : ""}.
                  </ReasonRow>
                )),
                guidance?.whenToUse && (
                  <ReasonRow key="guidance" ok>
                    {guidance.whenToUse}
                  </ReasonRow>
                ),
              ].filter(Boolean)}
        </Stack>
      </Box>

      {/* Preview + details */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" component="h4" gutterBottom>
            Preview
          </Typography>
          <Box
            component="img"
            src={chart.imageDescription}
            alt={`Example of a ${chart.type}`}
            sx={{ width: "100%", height: "auto", borderRadius: 2 }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack gap={3}>
            <Box>
              <Typography variant="subtitle2" component="h4" gutterBottom>
                When should I use this visualization?
              </Typography>
              <Stack gap={1}>
                <Typography variant="body2">
                  {chart.description}{" "}
                  <Link
                    underline="hover"
                    sx={{ cursor: "pointer" }}
                    onClick={() => window.open(chart.link, "_blank")}
                  >
                    <em>Learn more..</em>
                  </Link>
                </Typography>
                {guidance?.question && (
                  <Typography variant="body2" color="text.secondary">
                    <b>Answers:</b> {guidance.question}
                  </Typography>
                )}
                {guidance?.alternative && (
                  <Typography variant="body2" color="text.secondary">
                    <b>Consider another chart if:</b> {guidance.alternative}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" component="h4" gutterBottom>
                Data requirements
              </Typography>
              <Stack gap={1}>
                {chart.dataTypes?.map((type) => {
                  if (type.required !== 0) {
                    return (
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        key={type.type.value}
                      >
                        <Typography>
                          <b>#{type.type.value}</b> data columns:
                        </Typography>
                        <Chip color="info" label={`${type.required}`} />
                      </Stack>
                    );
                  }
                  return undefined;
                })}
              </Stack>
            </Box>

            {columnError.hasError && (
              <Stack gap={1}>
                <Alert severity="error">
                  <AlertTitle>Missing type of data</AlertTitle>
                  {columnError.errorMessages.map((msg, i) => (
                    <Typography
                      key={i}
                      sx={{ whiteSpace: "pre-line" }}
                      dangerouslySetInnerHTML={{ __html: msg }}
                    />
                  ))}
                </Alert>
                <Alert severity="info">
                  <AlertTitle>
                    Possible fix for using <b>{chart.type}</b>
                  </AlertTitle>
                  <Typography
                    sx={{ whiteSpace: "pre-line" }}
                    dangerouslySetInnerHTML={{
                      __html: `• Make sure to add the missing type of data in the <b>Specify requirements</b> step <em>OR</em>
                              • Make sure to insert the missing type of column(s) in the <b>Dataset</b> step`,
                    }}
                  />
                </Alert>
              </Stack>
            )}
          </Stack>
        </Grid>
        <Typography variant="caption">
          Source:{" "}
          <Link
            underline="hover"
            sx={{ cursor: "pointer" }}
            onClick={() =>
              window.open("https://datavizcatalogue.com/index.html", "_blank")
            }
          >
            Data Visualization Catalogue
          </Link>
        </Typography>
      </Grid>
    </Stack>
  );
};

VisualizationDescription.propTypes = {
  columnError: PropTypes.shape({
    hasError: PropTypes.bool,
    errorMessages: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default VisualizationDescription;
