import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { Button, CardActions, CardContent } from "@mui/material";

const items = [
  {
    year: "2025",
    authors: "Shoeb Joarder and Mohamed Amine Chatti",
    title:
      "The ISC Creator: Human-Centered Design of Learning Analytics Interactive Indicator Specification Cards",
    venue:
      "In Proceedings of the 17th International Conference on Education Technology and Computers (ICETC ’25)",
    pdfLink: "https://arxiv.org/pdf/2504.07811",
    details: "https://www.icetc.org/index.html",
  },
  {
    year: "2024",
    authors: "Shoeb Joarder, Mohamed Amine Chatti, and Ao Sun",
    title:
      "A No-Code Environment for Implementing Human-Centered Learning Analytics Indicators",
    venue:
      "In Companion Proceedings of the 14th International Learning Analytics and Knowledge Conference (LAK’24)",
    pdfLink:
      "https://www.solaresearch.org/core/companion-proceedings-of-the-14th-international-learning-analytics-and-knowledge-conference-lak24/",
    details: "https://www.solaresearch.org/events/lak/lak24/",
  },
  {
    year: "2023",
    authors:
      "Shoeb Joarder, Mohamed Amine Chatti, Seyedemarzie Mirhashemi, and Qurat Ul Ain",
    title:
      "Towards a Flexible User Interface for 'Quick and Dirty' Learning Analytics Indicator Design",
    venue:
      "In Proceedings of the Fourth International Workshop on Human-Centered Learning Analytics (HCLA) at the LAK'23 conference.",
    pdfLink: "http://arxiv.org/pdf/2304.01711",
    details: "http://sites.google.com/view/hcla23/home",
  },
  {
    year: "2022",
    authors:
      "Mohamed Amine Chatti, Volkan Yücepur, Arham Muslim, Mouadh Guesmi, Shoeb Joarder",
    title:
      "Designing Theory-Driven Analytics-Enhanced Self-Regulated Learning Applications",
    venue:
      "In: Sahin M., Ifenthaler D. (eds) Visualizations and Dashboards for Learning Analytics. Advances in Analytics for Learning and Teaching (pp. 47-68). Springer, Cham. https://doi.org/10.1007/978-3-030-81222-5_3",
    pdfLink:
      "https://www.uni-due.de/imperia/md/content/soco/chatti_visjournal_2021_final.pdf",
    details: "https://link.springer.com/chapter/10.1007/978-3-030-81222-5_3",
  },
  {
    year: "2020",
    authors:
      "Mohamed Amine Chatti, Arham Muslim, Mouadh Guesmi, Florian Richtscheid, Dawood Nasimi, Amin Shahin, and Ritesh Damera",
    title:
      "How to Design Effective Learning Analytics Indicators? A Human-Centered Design Approach",
    venue:
      "In Proceedings of the Fifteenth European Conference on Technology Enhanced Learning (ECTEL'20), pp. 303-317, 2020.",
    pdfLink:
      "https://www.uni-due.de/imperia/md/content/soco/chatti_et_al_hcid_ectel20.pdf",
    details: "https://link.springer.com/chapter/10.1007/978-3-030-57717-9_22",
  },
  {
    year: "2020",
    authors:
      "Mohamed Amine Chatti, Arham Muslim, Manpriya Guliani, Mouadh Guesmi",
    title: "The LAVA Model: Learning Analytics Meets Visual Analytics",
    venue:
      "In D. Ifenthaler & D. Gibson (Eds.), Adoption of Data Analytics in Higher Education Learning and Teaching (pp. 71-93). Cham: Springer.",
    pdfLink:
      "https://www.uni-due.de/imperia/md/content/soco/chatti_et_al_lava_model_chapter_springer_2020.pdf",
    details: "https://link.springer.com/chapter/10.1007/978-3-030-47392-1_5",
  },
  {
    year: "2020",
    authors: "Arham Muslim, Mohamed Amine Chatti, Mouadh Guesmi",
    title:
      "Open Learning Analytics: A Systematic Literature Review and Future Perspectives",
    venue:
      "In N. Pinkwart & S. Liu (Eds.), Artificial Intelligence Supported Educational Technologies (pp. 3-29). Cham: Springer.",
    pdfLink:
      "https://www.uni-due.de/imperia/md/content/soco/muslim_et_al_ola_review_chapter_springer_2020.pdf",
    details: "https://link.springer.com/chapter/10.1007/978-3-030-41099-5_1",
  },
];

export default function Publications() {
  const handleClick = (link) => {
    window.open(link);
  };

  return (
    <Box
      id="publications"
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
            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
            nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam
            erat, sed diam voluptua.
          </Typography>
        </Box>
        <Grid container spacing={1.5}>
          {items.map((item, index) => (
            <Grid size={{ xs: 12, md: 6 }} key={index}>
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
                  <Button
                    onClick={() => handleClick(item.pdfLink)}
                    endIcon={<PictureAsPdfIcon />}
                  >
                    View PDF
                  </Button>
                  <Button
                    onClick={() => handleClick(item.details)}
                    endIcon={<OpenInNewIcon />}
                  >
                    Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
