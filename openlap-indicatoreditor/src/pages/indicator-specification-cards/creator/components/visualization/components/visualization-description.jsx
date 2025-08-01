import { useContext } from "react";
import { Alert, AlertTitle, Chip, Link, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ISCContext } from "../../../indicator-specification-card.jsx";

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
            item
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
          <Grid container spacing={4}>
            <Grid size={{ xs: 12 }}>
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
                    Learn more
                  </Link>
                </span>
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography gutterBottom>
                <b>Required type of data for {visRef.chart.type}</b>
              </Typography>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1}>
                  {visRef.chart.dataTypes?.map((type, index) => {
                    if (type.required !== 0) {
                      return (
                        <Grid size={{ xs: 12 }} key={index}>
                          <Grid container spacing={1} alignItems="center">
                            <Chip color="warning" label={`${type.required}`} />
                            <Typography>
                              <b>{type.type.value}</b> required
                            </Typography>
                          </Grid>
                        </Grid>
                      );
                    }
                    return undefined;
                  })}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                {/* Show column validation errors */}
                {columnError.hasError && (
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12 }}>
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
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info">
                        <AlertTitle>
                          Possible fix for using <b>{visRef.chart.type}</b>
                        </AlertTitle>
                        <Typography
                          sx={{ whiteSpace: "pre-line" }}
                          dangerouslySetInnerHTML={{
                            __html: `• Make sure to add the missing type of data in the <b>Specify your goal, question, and indicator</b> step <em>OR</em>
                                    • Make sure to insert the missing type of column(s) in the <b>Dataset</b> step`,
                          }}
                        />
                      </Alert>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
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
