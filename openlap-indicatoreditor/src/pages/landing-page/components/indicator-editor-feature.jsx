import { useState } from "react";
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddchartIcon from "@mui/icons-material/Addchart";
import { useNavigate } from "react-router-dom";
import OpenLAPIndicatorEditorAbstract from "../../../assets/home/abstract-indicators.png";

const IndicatorEditorFeature = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);

  const toggleOpenDialog = () => setOpenDialog((p) => !p);
  return (
    <Container
      maxWidth="lg"
      sx={{ pt: { xs: 4, md: 12 }, pb: { xs: 10, md: 10 } }}
    >
      <Stack
        direction={{ xs: "column-reverse", md: "row" }}
        gap={4}
        alignItems="center"
      >
        <Box
          sx={{
            width: { xs: "100%", md: "40%" },
            display: { xs: "none", md: "flex" },
          }}
        >
          <Stack gap={4}>
            <Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{ display: { xs: "none", md: "flex" } }}
              >
                Indicator Editor
              </Typography>
              <Typography>
                The Indicator Editor is an interactive learning analytics tool
                that enables stakeholders who have knowledge about data analysis
                and visualization to implement high-fidelity learning analytics
                indicators based on real xAPI-based learning activity data, by
                supporting them in selecting data, choosing analysis methods,
                and specifying visualization techniques.
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                endIcon={<AddchartIcon />}
                onClick={() => navigate("/login")}
              >
                Implement indicators now!
              </Button>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ width: { xs: "100%", md: "60%" } }}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              position: "relative",
              border: { xs: "1px solid #bdbdbd", md: "none" },
            }}
          >
            <CardActionArea
              sx={{
                "&:hover + .search-icon, .search-icon:hover": {
                  opacity: 1,
                },
              }}
              onClick={toggleOpenDialog}
            >
              <CardMedia
                sx={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "contain",
                }}
                image={OpenLAPIndicatorEditorAbstract}
              />
            </CardActionArea>
            <CardContent sx={{ display: { xs: "flex", md: "none" } }}>
              <Stack gap={4}>
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Indicator Editor
                  </Typography>
                  <Typography>
                    The Indicator Editor is an interactive learning analytics
                    tool that enables stakeholders who have knowledge about data
                    analysis and visualization to implement high-fidelity
                    learning analytics indicators based on real xAPI-based
                    learning activity data, by supporting them in selecting
                    data, choosing analysis methods, and specifying
                    visualization techniques.
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    endIcon={<AddchartIcon />}
                    onClick={() => navigate("/login")}
                  >
                    Implement indicators now!
                  </Button>
                </Box>
              </Stack>
            </CardContent>
            <IconButton
              className="search-icon"
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                opacity: 0,
                transition: "opacity 0.3s",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "&:hover": {
                  opacity: 1,
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
              onClick={() => console.log("search clicked")}
            >
              <SearchIcon />
            </IconButton>
          </Card>
        </Box>
      </Stack>
      <Dialog maxWidth="xl" open={openDialog} onClose={toggleOpenDialog}>
        <DialogContent>
          <Box
            component="img"
            src={OpenLAPIndicatorEditorAbstract}
            sx={{ width: "100%", objectFit: "contain" }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default IndicatorEditorFeature;
