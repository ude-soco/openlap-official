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

const Analysis = () => {
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
                    <Chip label="3" color="primary" />
                  </Grid>
                  <Grid item>
                    <Typography>Analysis</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Analytics Technique */}
              <Grid item xs={12}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item>
                    <Typography>Technique:</Typography>
                  </Grid>
                  <Grid item xs>
                    <Grid container spacing={1}>
                      <Tooltip
                        title="Count N most occurring or least occurring items"
                        arrow
                      >
                        <Grid item>
                          <Chip label="Count N most occurring ..." />
                        </Grid>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* Analysis inputs */}
              <Grid item xs={12}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item>
                    <Typography>Inputs:</Typography>
                  </Grid>
                  <Grid item md>
                    <Grid container spacing={1}>
                      <Tooltip title="Activities (Items)" arrow>
                        <Grid item>
                          <Chip label="Activities" />
                        </Grid>
                      </Tooltip>
                      <Tooltip title="Users (Users)" arrow>
                        <Grid item>
                          <Chip label="Users" />
                        </Grid>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* Parameters */}
              <Grid item xs={12}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item>
                    <Typography>Parameters:</Typography>
                  </Grid>
                  <Grid item md>
                    <Grid container spacing={1}>
                      <Tooltip title="Most Occuring (Counting direction)" arrow>
                        <Grid item>
                          <Chip label="Most Occuring" />
                        </Grid>
                      </Tooltip>
                      <Tooltip title="All Items (Counting Type)" arrow>
                        <Grid item>
                          <Chip label="All Items" />
                        </Grid>
                      </Tooltip>
                      <Tooltip title="10 (Number of Items to Return (N))" arrow>
                        <Grid item>
                          <Chip label="10" />
                        </Grid>
                      </Tooltip>
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

export default Analysis;
