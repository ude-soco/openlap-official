import { Button, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { navigationIds } from "../data/navigation-data";
import usePublicContent from "../utils/use-public-content.js";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import Reveal from "./shared/reveal";
import { NewsCard } from "./shared/content-cards.jsx";
import ContentState from "./shared/content-state.jsx";

export default function News() {
  const { status, items, retry } = usePublicContent("news", 0, 5);
  const [featured, ...rest] = items;
  return (
    <Section
      id={navigationIds.NEWS}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 4, md: 6 },
      }}
    >
      <Reveal>
        <SectionHeading
          title="News"
          subtitle="All the updates, announcements, and stories from the Open Learning Analytics Platform"
          sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
        />
      </Reveal>
      {status !== "ready" || !items.length ? (
        <ContentState status={status} kind="news" onRetry={retry} />
      ) : (
        <>
          <Reveal sx={{ width: "100%" }}>
            <NewsCard item={featured} featured />
          </Reveal>
          <Reveal sx={{ width: "100%" }} delay={80}>
            <Grid container spacing={3}>
              {rest.map((item) => (
                <Grid size={{ xs: 12, md: 6 }} key={item.id}>
                  <NewsCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Reveal>
        </>
      )}
      <Button
        component={RouterLink}
        to="/news"
        endIcon={<ArrowForwardRoundedIcon />}
      >
        View all news
      </Button>
    </Section>
  );
}
