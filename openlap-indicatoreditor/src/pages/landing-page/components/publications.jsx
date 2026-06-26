import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import publicationItems from "../utils/publication-data.json";
import { navigationIds } from "../utils/navigation-data";
import SectionHeading from "./shared/section-heading";
import MoreLink from "./shared/more-link";
import Reveal from "./shared/reveal";

export default function Publications() {
  const handleClick = (link) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Box
      id={navigationIds.PUBLICATION}
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        color: "common.white",
        bgcolor: "#06090a",
      }}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 4, sm: 6 },
        }}
      >
        <Reveal>
          <SectionHeading
            title="Publications"
            subtitle="Discover our research on the Open Learning Analytics Platform"
            subtitleColor="grey.400"
            sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
          />
        </Reveal>

        <Reveal sx={{ width: "100%" }}>
          <Grid container spacing={3}>
            {publicationItems.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    color: "inherit",
                    bgcolor: "grey.900",
                    border: "1px solid",
                    borderColor: "grey.800",
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 3.5 }, flexGrow: 1 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={item.type}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: "grey.700",
                            color: "grey.400",
                            fontWeight: 500,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "grey.500" }}>
                          {item.year}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ fontWeight: 700, color: "grey.100" }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.400" }}>
                        {item.authors}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "grey.500" }}>
                        {item.venue}
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions
                    sx={{ px: { xs: 3, md: 3.5 }, pb: { xs: 3, md: 3.5 }, pt: 0, gap: 1 }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleClick(item.pdfLink)}
                    >
                      Get PDF
                    </Button>
                    <Button
                      size="small"
                      endIcon={<OpenInNewIcon />}
                      onClick={() => handleClick(item.details)}
                      sx={{ color: "grey.300" }}
                    >
                      Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Reveal>

        <MoreLink
          label="More publications"
          href="https://www.uni-due.de/soco/publications.php"
        />
      </Container>
    </Box>
  );
}
