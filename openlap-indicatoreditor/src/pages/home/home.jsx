import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  Grid,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import { requestUserDetails } from "../account-manager/utils/account-manager-api";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import homeData from "./utils/home-data";
import {
  PENDING_PERSONALIZED_SAVE_KEY,
  buildCreatePayloadWithIndicatorName,
  buildPersonalizedCreatePayload,
} from "../indicators/utils/personalized-save";

export default function Home() {
  const {
    api,
    user,
    user: { roles },
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const [state, setState] = useState({
    loading: false,
    user: { name: "", lrsProviderList: [], lrsConsumerList: [] },
  });

  // Pending save state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingPersonalizedSave, setPendingPersonalizedSave] = useState(null);
  const [indicatorName, setIndicatorName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  // Check for pending personalized indicator save after login/redirect.
  useEffect(() => {
    if (!user) return;

    const rawPendingSave = sessionStorage.getItem(PENDING_PERSONALIZED_SAVE_KEY);
    if (!rawPendingSave) return;

    const preparePendingSave = async () => {
      try {
        const pendingSave = JSON.parse(rawPendingSave);
        if (!pendingSave?.id || !pendingSave?.userId || !pendingSave?.lrsId) return;

        const indicatorResponse = await api.get(`/v1/indicators/${pendingSave.id}`);
        const indicatorData = indicatorResponse?.data?.data;
        if (!indicatorData?.configuration) {
          throw new Error("Indicator configuration is not available.");
        }

        const configuration = JSON.parse(indicatorData.configuration);
        const preparedPayload = buildPersonalizedCreatePayload({
          baseConfiguration: configuration,
          pendingSave,
        });

        setPendingPersonalizedSave(preparedPayload);
        setIndicatorName(preparedPayload.name);
        setSaveError("");
        setSaveDialogOpen(true);
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error("Failed to parse pendingPersonalizedSave payload", error);
          sessionStorage.removeItem(PENDING_PERSONALIZED_SAVE_KEY);
          return;
        }

        console.error("Failed to prepare pending personalized save payload", error);
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not prepare personalized indicator save.";
        setSaveError(message);
        enqueueSnackbar(message, { variant: "error" });
      }
    };

    preparePendingSave();
  }, [api, enqueueSnackbar, user]);

  const handlePendingSave = async () => {
    if (!indicatorName.trim() || !pendingPersonalizedSave) return;

    setSaveLoading(true);
    setSaveError("");

    try {
      const originalIndicator = buildCreatePayloadWithIndicatorName(
        pendingPersonalizedSave,
        indicatorName.trim()
      );
      const rawPendingSave = sessionStorage.getItem(PENDING_PERSONALIZED_SAVE_KEY);
      const parsedPendingSave = rawPendingSave ? JSON.parse(rawPendingSave) : null;
      const pendingLrsId = pendingPersonalizedSave?.lrsId || parsedPendingSave?.lrsId;
      const pendingUserId = pendingPersonalizedSave?.userId || parsedPendingSave?.userId;

      if (!pendingLrsId || !pendingUserId) {
        throw new Error("Missing personalized save LRS context.");
      }

      const createPayload = {
        ...originalIndicator,
        name: indicatorName.trim(),
        platform:
          pendingPersonalizedSave?.platform ||
          parsedPendingSave?.platform ||
          sessionStorage.getItem("externalPlatform") ||
          "CourseMapper",
        indicatorQuery: {
          ...(originalIndicator?.indicatorQuery || {}),
          // CRITICAL FIX: Completely overwrite the original LRS stores
          lrsStores: [
            {
              lrsId: pendingLrsId,
              userId: pendingUserId,
              uniqueIdentifier: pendingUserId,
            },
          ],
        },
      };

      const response = await api.post("v1/indicators/basic/create", createPayload);
      const responseData = response?.data;

      let newIndicatorId =
        responseData?.data?.id ||
        responseData?.id ||
        responseData?.data?.indicatorId ||
        responseData?.indicatorId;

      if (!newIndicatorId) {
        // Fallback for backend variants that return success without the created id.
        const listResponse = await api.get("v1/indicators/my", {
          params: {
            page: 0,
            size: 10,
            sortDirection: "dsc",
            sortBy: "createdOn",
          },
        });

        const recentIndicators = listResponse?.data?.data?.content || [];
        const matchByName = recentIndicators.find(
          (item) => item?.indicatorName === indicatorName.trim()
        );
        newIndicatorId = matchByName?.id;
      }

      setSaveDialogOpen(false);
      setPendingPersonalizedSave(null);
      setIndicatorName("");
      sessionStorage.removeItem(PENDING_PERSONALIZED_SAVE_KEY);

      sessionStorage.setItem("pendingToast", `Indicator "${indicatorName.trim()}" saved successfully.`);

      navigate(newIndicatorId ? `/indicator/${newIndicatorId}` : "/indicator");
    } catch (error) {
      console.error("Failed to save personalized indicator", error);
      console.error("Save error response:", error?.response?.data);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save indicator. Please try again.";
      setSaveError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setSaveLoading(false);
    }
  };

  const loadUserData = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const userData = await requestUserDetails(api);
      setState((p) => ({ ...p, user: { ...p.user, ...userData } }));
    } catch (error) {
      console.error("Failed to load user data", error);
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  const handleCancelSave = () => {
    setSaveDialogOpen(false);
    setPendingPersonalizedSave(null);
    setIndicatorName("");
    setSaveError("");
  };

  return (
    <>
      <Stack gap={2}>
        <Typography color="textPrimary">Home</Typography>
        <Divider />

        {state.loading && (
          <>
            <Typography gutterBottom>Loading</Typography>
            <LinearProgress />
          </>
        )}
        {!state.loading && (
          <>
            <Typography variant="h4" gutterBottom>
              Hello, {state.user.name}
            </Typography>
            <Grid container spacing={2}>
              {homeData.map((home) => {
                const disabled = roles.some((role) =>
                  home.disabledRoles.includes(role)
                );
                if (!disabled) {
                  return (
                    <Grid
                      key={home.id}
                      size={{ xs: 12, sm: 6, lg: 4 }}
                      sx={{ display: "flex" }}
                    >
                      <Card
                        variant="outlined"
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                        <CardMedia sx={{ height: 350 }} image={home.image} />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div">
                            {home.label}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {home.description}
                          </Typography>
                        </CardContent>
                        <Stack
                          direction={isSmallScreen ? "column" : "row"}
                          sx={{ p: 1 }}
                          spacing={1}
                        >
                          {home.buttons.map((button) => (
                            <Button
                              disableElevation
                              size="small"
                              key={button.id}
                              fullWidth
                              variant={button.variant}
                              startIcon={
                                button.icon
                                  ? React.createElement(button.icon)
                                  : null
                              }
                              onClick={() => navigate(button.link)}
                            >
                              {button.label}
                            </Button>
                          ))}
                        </Stack>
                      </Card>
                    </Grid>
                  );
                }
                return undefined;
              })}
            </Grid>
          </>
        )}
      </Stack>

      {/* Name Dialog for Pending Indicator Save */}
      <Dialog
        fullWidth
        maxWidth="sm"
        open={saveDialogOpen}
        onClose={handleCancelSave}
      >
        <DialogTitle>Provide a name to the indicator</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            You were previewing a public indicator with your data. Provide a name to save it to your dashboard.
          </Typography>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Box sx={{ py: 1 }}>
            <TextField
              fullWidth
              label="Indicator name"
              value={indicatorName}
              placeholder="e.g., The most frequently accessed learning materials in my course"
              onChange={(e) => setIndicatorName(e.target.value)}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleCancelSave}
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button
            disabled={indicatorName.trim().length === 0 || saveLoading}
            fullWidth
            variant="contained"
            onClick={handlePendingSave}
          >
            {saveLoading ? "Saving..." : "Save to dashboard"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
