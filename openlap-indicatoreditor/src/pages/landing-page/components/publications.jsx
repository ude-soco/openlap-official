import {
  Box,
  Button,
  CardActions,
  CardContent,
  Card,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import publicationItems from "../utils/publication-data.json";
import { navigationIds } from "../utils/navigation-data";
import SectionHeading from "./shared/section-heading";
import MoreLink from "./shared/more-link";

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
        color: "white",
        bgcolor: "#06090a",
      }}
    >
      <Container
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 3, sm: 6 },
        }}
      >
        <SectionHeading
          title="Publications"
          subtitle="Discover our papers on Open Learning Analytics Platform"
          subtitleColor="grey.400"
          sx={{ width: { sm: "100%", md: "60%" } }}
        />
        <Grid container spacing={1.5}>
          {publicationItems.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card
                sx={{
                  color: "inherit",
                  height: "100%",
                  border: "1px solid",
                  borderColor: "grey.800",
                  background: "transparent",
                  backgroundColor: "grey.900",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ p: 2, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.400" }}
                    gutterBottom
                  >
                    {item.year}
                  </Typography>
                  <Typography fontWeight="medium" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.400" }}
                    gutterBottom
                  >
                    {item.authors}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.400" }}>
                    {item.venue}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button onClick={() => handleClick(item.pdfLink)}>
                    Get PDF
                  </Button>
                  <Button onClick={() => handleClick(item.details)}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        <MoreLink
          label="More publications"
          href="https://www.uni-due.de/soco/publications.php"
        />
      </Container>
    </Box>
  );
}
