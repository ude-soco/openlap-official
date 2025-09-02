import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Button, Link, Paper } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { navigationIds } from "../utils/navigation-data";
import { newsItems } from "../utils/news-data";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";

export default function News() {
  const { theme } = useContext(CustomThemeContext);

  const sortedNews = [...newsItems].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

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

      <Timeline position="alternate">
        {sortedNews.map((item, index) => (
          <TimelineItem key={item.id} sx={{ pb: 1 }}>
            <TimelineOppositeContent color="textSecondary">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {item.date}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color="primary" />
              {index < sortedNews.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Box component={Paper} sx={{ p: 2 }} variant="outlined">
                <Typography fontWeight="medium" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.primary" gutterBottom>
                  {item.desc}
                </Typography>
                {item.venue && (
                  <Typography variant="body2" sx={{ color: "grey.600" }}>
                    {item.venue}
                  </Typography>
                )}
              </Box>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

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
          onClick={() => window.open("https://www.uni-due.de/soco/news.php")}
        >
          <span>More News</span>
          <OpenInNewIcon fontSize="small" sx={{ mt: "1px", ml: "2px" }} />
        </Link>
      </Box>
    </Container>
  );
}
