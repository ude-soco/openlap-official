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

const Filters = () => {
  return (
    <>
      <Accordion sx={{ mb: 1 }} disabled>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                {/* <Grid item>
                  <Chip
                    label="2"
                    color="primary"
                  />
                </Grid> */}
                <Grid item>
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                </Grid>
                <Grid item>
                  <Typography>Filters</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          malesuada lacus ex, sit amet blandit leo lobortis eget.
        </AccordionDetails>
      </Accordion>
      <Accordion sx={{ mb: 1 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Chip label="2" color="primary" />
                </Grid>
                <Grid item>
                  <Typography>Filters</Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Activity Types */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Activity Types:</Typography>
                </Grid>
                <Grid item>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Chip label="Material" />
                    </Grid>
                    <Grid item>
                      <Chip label="Courses" />
                    </Grid>

                    <Grid item>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        5 more ...
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Activities */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Activities:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Chip label="Activity 1" />
                    </Grid>
                    <Grid item>
                      <Chip label="Activity 2" />
                    </Grid>
                    <Grid item>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        17 more ...
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Action on Activites */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Actions:</Typography>
                </Grid>
                <Grid item>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Chip label="Annotated" />
                    </Grid>
                    <Grid item>
                      <Chip label="Replied" />
                    </Grid>
                    <Grid item>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        7 more ...
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Date Range:</Typography>
                </Grid>
                <Grid item sm>
                  <Grid container spacing={1}>
                    <Tooltip title="10/02/2023 (From)" arrow>
                      <Grid item>
                        <Chip label="10/02/2023" />
                      </Grid>
                    </Tooltip>
                    <Tooltip title="20/02/2024 (Until)" arrow>
                      <Grid item>
                        <Chip label="20/02/2024" />
                      </Grid>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Users */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Users:</Typography>
                </Grid>
                <Grid item xs>
                  <Grid container spacing={1}>
                    <Grid item>
                      <Chip label="Only me" />
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
      </Accordion>
    </>
  );
};

export default Filters;
