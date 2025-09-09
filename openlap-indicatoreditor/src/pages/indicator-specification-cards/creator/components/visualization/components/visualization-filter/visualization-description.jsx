import { useContext } from "react";
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
import { ISCContext } from "../../../../indicator-specification-card";

const VisualizationDescription = ({ columnError }) => {
  const { visRef } = useContext(ISCContext);

  return (
    <>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography gutterBottom>
            <b>{visRef.chart.type} preview</b>
          </Typography>
          <Grid
            size={{ xs: 12 }}
            component="img"
            src={visRef.chart.imageDescription}
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: 2,
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack gap={4}>
            <Box>
              <Typography gutterBottom>
                <b>Short description</b>
              </Typography>
              <Typography>
                {visRef.chart.description}{" "}
                <span>
                  <Link
                    underline="hover"
                    sx={{ cursor: "pointer" }}
                    onClick={() => window.open(visRef.chart.link, "_blank")}
                  >
                    <em>Learn more..</em>
                  </Link>
                </span>
              </Typography>
            </Box>
            <Box>
              <Typography gutterBottom>
                <b>Requirements</b>
              </Typography>
              <Stack gap={1}>
                {visRef.chart.dataTypes?.map((type, index) => {
                  if (type.required !== 0) {
                    return (
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        key={index}
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
            {/* Show column validation errors */}
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
                    Possible fix for using <b>{visRef.chart.type}</b>
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
    </>
  );
};

export default VisualizationDescription;
