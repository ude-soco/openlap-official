import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import { navigationIds } from "../utils/navigation-data";
import { newsItems } from "../utils/news-data";
import { Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function News() {
  return (
    <Container
      id={navigationIds.NEWS}
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
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
        <Typography component="h2" variant="h4" color="text.primary">
          News
        </Typography>
        <Typography variant="body1" color="text.secondary">
          All the updates, announcements, and stories from Open Learning
          Analytics Platform
        </Typography>
      </Box>
      <Grid container direction="column" spacing={2}>
        {newsItems.map((item) => (
          <Grid size={{ xs: 12 }} key={item.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  {item.date}
                </Typography>
                <Typography fontWeight="medium">{item.title}</Typography>
                <Typography color="inherit" variant="body2" gutterBottom>
                  {item.desc}
                </Typography>

                <Typography variant="body2" sx={{ color: "grey.400" }}>
                  {item.venue}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container justifyContent="space-between">
        <Button
          endIcon={<OpenInNewIcon />}
          onClick={() => window.open("https://www.uni-due.de/soco/news.php")}
        >
          More news
        </Button>
      </Grid>
    </Container>
  );
}
