import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import IndicatorSpecificationCard from "./indicator-specification-card.jsx";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestISCDetails } from "../dashboard/utils/dashboard-api.js";
import { createOrGetEditDraft } from "./utils/isc-draft-api.js";

// Route-authoritative entry points (Phase 3). These prepare the creator's
// session/draft state from the ROUTE (not stale sessionStorage), then render or
// redirect. The creator itself still reads its session — these loaders guarantee
// what's in it, so the route is the source of truth.

const Centered = ({ children }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    {children}
  </Box>
);
Centered.propTypes = { children: PropTypes.node };

const LoadError = ({ message }) => {
  const navigate = useNavigate();
  return (
    <Centered>
      <Stack gap={2} alignItems="center">
        <Typography color="text.secondary">{message}</Typography>
        <Button variant="contained" onClick={() => navigate("/isc")}>
          Back to My ISCs
        </Button>
      </Stack>
    </Centered>
  );
};
LoadError.propTypes = { message: PropTypes.node };

const parseDetails = (details) => ({
  requirements: JSON.parse(details.requirements),
  dataset: JSON.parse(details.dataset),
  visRef: JSON.parse(details.visRef),
  lockedStep: JSON.parse(details.lockedStep),
});

// /isc/new — start a clean new draft. Discards any non-new (edit/legacy) session
// so no saved id is inferred; a NEW_DRAFT recovery is kept (refresh-safe).
export const IscNewRoute = () => {
  const { SESSION_ISC } = useContext(AuthContext);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_ISC);
    if (saved) {
      try {
        const meta = JSON.parse(saved).draftMeta;
        if (!meta || meta.mode !== "NEW_DRAFT") {
          sessionStorage.removeItem(SESSION_ISC);
        }
      } catch {
        sessionStorage.removeItem(SESSION_ISC);
      }
    }
    setReady(true);
  }, [SESSION_ISC]);

  if (!ready) return null;
  return <IndicatorSpecificationCard />;
};

// /isc/drafts/:draftId — load a backend draft authoritatively by route param.
export const IscDraftLoader = () => {
  const { draftId } = useParams();
  const { api, SESSION_ISC } = useContext(AuthContext);
  const [state, setState] = useState({ ready: false, error: false });

  useEffect(() => {
    let active = true;
    setState({ ready: false, error: false });
    (async () => {
      try {
        const details = await requestISCDetails(api, draftId);
        const parsed = parseDetails(details);
        parsed.visRef.edit = true;
        const sourceId = details.sourceId || null;
        // draftMeta reconstructed from BACKEND data (status/sourceId), not session.
        sessionStorage.setItem(
          SESSION_ISC,
          JSON.stringify({
            id: null,
            requirements: parsed.requirements,
            dataset: parsed.dataset,
            visRef: parsed.visRef,
            lockedStep: parsed.lockedStep,
            draftMeta: {
              mode: sourceId ? "EDIT_DRAFT" : "NEW_DRAFT",
              draftId,
              sourceId,
              status: details.status || "DRAFT",
              lastAutosavedAt: null,
              autosaveError: null,
            },
          })
        );
        if (active) setState({ ready: true, error: false });
      } catch (error) {
        console.error("Could not load draft", error);
        if (active) setState({ ready: false, error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [api, SESSION_ISC, draftId]);

  if (state.error) {
    return <LoadError message="Could not load this draft." />;
  }
  if (!state.ready) {
    return (
      <Centered>
        <CircularProgress />
      </Centered>
    );
  }
  // key forces a fresh creator mount per draft.
  return <IndicatorSpecificationCard key={draftId} />;
};

// /isc/:id/edit — create-or-get an edit draft for a saved ISC, then redirect to
// the draft route. Falls back to a legacy in-session edit if the draft endpoint
// is unavailable.
export const IscEditBootstrap = () => {
  const { id } = useParams();
  const { api, SESSION_ISC } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const editDraft = await createOrGetEditDraft(api, id);
        if (active) navigate(`/isc/drafts/${editDraft.id}`, { replace: true });
      } catch (draftError) {
        console.warn("Edit-draft endpoint unavailable; using legacy edit", draftError);
        try {
          const details = await requestISCDetails(api, id);
          const parsed = parseDetails(details);
          parsed.visRef.edit = true;
          // Legacy fallback: keep the source id so publish uses the update path.
          sessionStorage.setItem(
            SESSION_ISC,
            JSON.stringify({ id, ...parsed })
          );
          if (active) navigate(`/isc/creator/edit/${id}`, { replace: true });
        } catch (loadError) {
          console.error("Could not open indicator for editing", loadError);
          enqueueSnackbar("Could not open this indicator for editing", {
            variant: "error",
          });
          if (active) setError(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [api, SESSION_ISC, id, navigate, enqueueSnackbar]);

  if (error) {
    return <LoadError message="Could not open this indicator for editing." />;
  }
  return (
    <Centered>
      <CircularProgress />
    </Centered>
  );
};
