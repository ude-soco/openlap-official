import {
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  AccordionDetails,
  Grid,
  Typography,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

const Visualization = () => {
  return (
    <>
      <Accordion sx={{ mb: 1 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Chip label="4" color="primary" />
                </Grid>
                <Grid item>
                  <Typography>Visualization Method</Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Visualization Library */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Library:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1}>
                    <Grid item>
                      <Chip label="C3.js" />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Visualization Type */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Type:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1}>
                    <Grid item>
                      <Chip label="Bar Chart" />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Visualization Inputs */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Inputs:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1}>
                    <Grid item>
                      <Chip label="Item names (X-Axis)" />
                    </Grid>
                    <Grid item>
                      <Chip label="Item count (Y-Axis)" />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          malesuada lacus ex, sit amet blandit leo lobortis eget.
        </AccordionDetails>
        <AccordionActions>
          <Button>Cancel</Button>
          <Button>Agree</Button>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
