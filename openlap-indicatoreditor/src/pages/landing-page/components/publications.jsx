import {
  Box,
  Button,
  CardActions,
  CardContent,
  Card,
  Container,
  Grid,
  Typography,
  Link,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import publicationItems from "../utils/publication-data";
import { navigationIds } from "../utils/navigation-data";

export default function Publications() {
  const handleClick = (link) => {
    window.open(link);
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
        <Box
          sx={{
            width: { sm: "100%", md: "60%" },
            textAlign: { sm: "left", md: "center" },
          }}
        >
          <Typography component="h2" variant="h4">
            Publications
          </Typography>
          <Typography variant="body1" sx={{ color: "grey.400" }}>
            Discover our papers on Open Learning Analytics Platform
          </Typography>
        </Box>
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
        <Box>
          <Link
            component="button"
            color="primary"
            fontWeight="bold"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              "& > svg": { transition: "0.2s" },
              "&:hover > svg": { transform: "translateX(4px)" },
            }}
            onClick={() => window.open("https://www.uni-due.de/soco/publications.php")}
          >
            <span>More publications</span>
            <OpenInNewIcon fontSize="small" sx={{ mt: "1px", ml: "2px" }} />
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
