import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { v4 as uuidv4 } from "uuid";
import SpecifyRequirements from "./components/specify-requirements/specify-requirements.jsx";
import ChoosePath from "./components/choose-path/choose-path.jsx";
import Visualization from "./components/visualization/visualization.jsx";
import Dataset from "./components/dataset/dataset.jsx";
import Finalize from "./components/finalize/finalize.jsx";
import ISCWorkspace from "./components/isc-workspace/isc-workspace.jsx";
import WorkflowStepper from "./components/workflow-stepper/workflow-stepper.jsx";
import { DataTypes } from "./utils/data/config.js";
import { LEGACY_STEP_CODE } from "./utils/isc-constants.js";
import { getWorkflowSteps, getCurrentStep } from "./utils/isc-selectors.js";
import { withOnlyStepExpanded } from "./utils/isc-workflow-ui.js";
import { getDefaultVisRef } from "./utils/isc-workflow-reset.js";
import {
  createDraft,
  discardDraft,
  publishDraft,
  updateDraft,
} from "./utils/isc-draft-api.js";
import LeaveEditDialog from "./components/leave-edit-dialog.jsx";
import { ISCContext } from "./isc-context.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

// How long after the last change to autosave the draft to the backend.
const AUTOSAVE_DEBOUNCE_MS = 2000;

// Derive the creator's draft metadata from a restored sessionStorage object.
// Backend-backed drafts carry an explicit `draftMeta`; older sessions are kept
// working via a LEGACY_SESSION fallback (publish falls back to create/update).
const initDraftMeta = (saved) => {
  if (saved && saved.draftMeta) {
    return { lastAutosavedAt: null, autosaveError: null, ...saved.draftMeta };
  }
  if (saved && saved.id) {
    // Legacy edit session (old behavior wrote the source id into the draft).
    return {
      mode: "LEGACY_SESSION",
      draftId: null,
      sourceId: saved.id,
      status: "SAVED",
      lastAutosavedAt: null,
      autosaveError: null,
    };
  }
  if (saved) {
    // Legacy new session with no id.
    return {
      mode: "LEGACY_SESSION",
      draftId: null,
      sourceId: null,
      status: null,
      lastAutosavedAt: null,
      autosaveError: null,
    };
  }
  // Fresh new ISC → a backend draft will be created lazily on first autosave.
  return {
    mode: "NEW_DRAFT",
    draftId: null,
    sourceId: null,
    status: "DRAFT",
    lastAutosavedAt: null,
    autosaveError: null,
  };
};

const IndicatorSpecificationCard = () => {
  const { SESSION_ISC, api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  // `id` is only initialized from the restored draft; it is never set via state
  // afterwards (the setter was unused), so no setter is destructured.
  const [id] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    return savedState
      ? JSON.parse(savedState).id
        ? JSON.parse(savedState).id
        : null
      : null;
  });

  // Frontend draft metadata — kept SEPARATE from the four domain slices and
  // never sent inside the backend payload. The database is the source of truth;
  // sessionStorage holds only a local recovery copy (incl. this metadata).
  const [draftMeta, setDraftMeta] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    try {
      return initDraftMeta(savedState ? JSON.parse(savedState) : null);
    } catch {
      return initDraftMeta(null);
    }
  });

  const [requirements, setRequirements] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    return savedState
      ? JSON.parse(savedState).requirements
      : {
          goalType: {
            id: "",
            verb: "",
            category: "",
            description: "",
            custom: false,
            active: true,
          },
          goal: "",
          question: "",
          indicatorName: "",
          data: [
            {
              id: uuidv4(),
              value: "",
              placeholder: "e.g., name of materials",
              type: {},
            },
            {
              id: uuidv4(),
              value: "",
              placeholder: "e.g., number of downloads",
              type: {},
            },
          ],
          selectedPath: "",
          edit: {
            goal: true,
            question: true,
            indicatorName: true,
          },
          show: {
            goal: false,
            question: false,
            indicatorName: false,
          },
        };
  });

  const [dataset, setDataset] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    return savedState
      ? JSON.parse(savedState).dataset
      : {
          file: { name: "" },
          rows: [],
          columns: [],
        };
  });

  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    return savedState ? JSON.parse(savedState).visRef : getDefaultVisRef();
  });

  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION_ISC);
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          requirements: {
            locked: false,
            openPanel: true,
            step: LEGACY_STEP_CODE.REQUIREMENTS,
          },
          path: { locked: true, openPanel: false, step: LEGACY_STEP_CODE.PATH },
          visualization: {
            locked: true,
            openPanel: false,
            step: LEGACY_STEP_CODE.NONE,
          },
          dataset: {
            locked: true,
            openPanel: false,
            step: LEGACY_STEP_CODE.NONE,
          },
          finalize: {
            locked: true,
            openPanel: false,
            step: LEGACY_STEP_CODE.FINALIZE,
          },
        };
  });

  // ---- Autosave plumbing (refs avoid stale closures in the debounced saver) ----
  const latestDomainRef = useRef({ requirements, dataset, visRef, lockedStep });
  const draftMetaRef = useRef(draftMeta);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const lastSavedRef = useRef(null); // serialized domain of the last successful autosave
  const autosaveTimer = useRef(null);

  useEffect(() => {
    latestDomainRef.current = { requirements, dataset, visRef, lockedStep };
    draftMetaRef.current = draftMeta;
  });

  useEffect(() => {
    const newColumns = requirements.data.map((item, index) => ({
      field: item.id,
      headerName: item.value || `Column ${index + 1}`,
      type: item.type.type || DataTypes.categorical.value,
      editable: true,
      sortable: false,
      width: 200,
      dataType: item.type,
      align: "left",
      headerAlign: "left",
      renderHeader: () => (
        <span>
          <Typography>{item.value || `Column ${index + 1}`}</Typography>
          <Typography variant="caption">{item.type.value}</Typography>
        </span>
      ),
    }));

    setDataset((prev) => {
      const prevRows = prev.rows || [];
      const prevColumnsMap = (prev.columns || []).reduce((acc, col) => {
        acc[col.field] = col;
        return acc;
      }, {});

      const numberOfRows = prevRows.length || 3;
      const updatedRows = [];

      if (newColumns.length) {
        for (let i = 0; i < numberOfRows; i++) {
          const prevRow = prevRows[i] || { id: uuidv4() };
          const newRow = { ...prevRow };

          // * In case the file was not uploaded
          if (!prev.file.name) {
            newColumns.forEach((col) => {
              const oldCol = prevColumnsMap[col.field];
              const oldType = oldCol?.type;

              // * If column is new or type has changed, reset value
              if (!(col.field in newRow) || oldType !== col.type) {
                newRow[col.field] =
                  col.type === "string" ? `${col.headerName} ${i + 1}` : 0;
              }
            });
          }
          updatedRows.push(newRow);
        }
      }

      return {
        ...prev,
        file: { name: "" },
        columns: newColumns,
        rows: updatedRows,
      };
    });
  }, [requirements.data]);

  // Runs the actual backend autosave from refs (latest state, current draftId),
  // guarding against overlapping saves. Backend-backed modes only; legacy
  // sessions remain sessionStorage-only (see the recovery effect below).
  const runAutosave = useCallback(async () => {
    const meta = draftMetaRef.current;
    const isBackendMode = meta.mode === "NEW_DRAFT" || meta.mode === "EDIT_DRAFT";
    if (!isBackendMode) return;
    if (savingRef.current) {
      pendingRef.current = true; // coalesce: re-run once the in-flight save finishes
      return;
    }
    const domain = latestDomainRef.current;
    const serialized = JSON.stringify(domain);
    if (serialized === lastSavedRef.current) return; // nothing changed

    savingRef.current = true;
    try {
      if (!meta.draftId) {
        const res = await createDraft(api, domain);
        setDraftMeta((m) => ({
          ...m,
          draftId: res.id,
          status: res.status || "DRAFT",
          lastAutosavedAt: Date.now(),
          autosaveError: null,
        }));
      } else {
        await updateDraft(api, meta.draftId, domain);
        setDraftMeta((m) => ({ ...m, lastAutosavedAt: Date.now(), autosaveError: null }));
      }
      lastSavedRef.current = serialized;
    } catch (error) {
      setDraftMeta((m) => ({
        ...m,
        autosaveError: error?.message || "Autosave failed",
      }));
      enqueueSnackbar("Couldn't autosave to the server — your work is kept locally.", {
        variant: "warning",
        autoHideDuration: 3000,
      });
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        runAutosave();
      }
    }
  }, [api, enqueueSnackbar]);

  // On any change: (1) write the local recovery copy immediately (incl. draft
  // metadata), and (2) debounce a backend autosave. sessionStorage is a backup,
  // not the source of truth.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_ISC,
        JSON.stringify({ id, requirements, dataset, visRef, lockedStep, draftMeta })
      );
    } catch {
      // Storage may be unavailable (private mode/quota) — backend remains authoritative.
    }

    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(runAutosave, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [
    id,
    requirements,
    dataset,
    visRef,
    lockedStep,
    draftMeta,
    SESSION_ISC,
    runAutosave,
  ]);

  // Derive the (informational) workflow-stepper view from the real runtime state
  // (lockedStep + completeness selectors). Pure read — does not affect gating.
  const domainState = { requirements, dataset, visRef, lockedStep };
  const workflowSteps = getWorkflowSteps(domainState);
  const currentStep = getCurrentStep(domainState);

  // Stepper navigation: expand the chosen (unlocked) section and collapse the
  // others — the one-active-section model, on top of the existing lockedStep.
  const handleSelectStep = (stepKey) => {
    setLockedStep((p) =>
      p[stepKey]?.locked ? p : withOnlyStepExpanded(p, stepKey)
    );
  };

  // ---- Leave-page protection for EDIT drafts (Phase 3) ----
  // Only edit drafts guard navigation (publishing merges into the saved source).
  // New drafts already live in My ISCs once autosaved, so leaving is harmless.
  const isEditDraft = draftMeta.mode === "EDIT_DRAFT";
  const [leaveTo, setLeaveTo] = useState(null);
  const [leaving, setLeaving] = useState(false);

  // Browser-level guard (refresh / tab close / external URL). Generic prompt.
  useEffect(() => {
    if (!isEditDraft) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditDraft]);

  // Intercept the creator's own breadcrumb navigation while editing a draft.
  const guardCrumb = (to) =>
    isEditDraft
      ? (e) => {
          e.preventDefault();
          setLeaveTo(to);
        }
      : undefined;

  const proceedLeave = (to) => {
    setLeaveTo(null);
    navigate(to);
  };

  const handleSaveAndLeave = async () => {
    const to = leaveTo;
    if (!draftMeta.draftId) {
      proceedLeave(to);
      return;
    }
    setLeaving(true);
    try {
      const domain = { requirements, dataset, visRef, lockedStep };
      await updateDraft(api, draftMeta.draftId, domain);
      await publishDraft(api, draftMeta.draftId);
      sessionStorage.removeItem(SESSION_ISC);
      enqueueSnackbar("Indicator updated — it's now available in My ISCs.", {
        variant: "success",
      });
      setLeaving(false);
      proceedLeave(to);
    } catch (error) {
      enqueueSnackbar(error?.message || "Could not save changes", {
        variant: "error",
      });
      setLeaving(false); // keep dialog open so the user can retry / keep / discard
    }
  };

  const handleKeepAndLeave = () => {
    const to = leaveTo;
    sessionStorage.removeItem(SESSION_ISC); // backend draft remains; local copy cleared
    proceedLeave(to);
  };

  const handleDiscardAndLeave = async () => {
    const to = leaveTo;
    setLeaving(true);
    try {
      if (draftMeta.draftId) await discardDraft(api, draftMeta.draftId);
      sessionStorage.removeItem(SESSION_ISC);
      setLeaving(false);
      proceedLeave(to);
    } catch (error) {
      enqueueSnackbar(error?.message || "Could not discard draft", {
        variant: "error",
      });
      setLeaving(false);
    }
  };

  return (
    <>
      <ISCContext.Provider
        value={{
          id,
          requirements,
          setRequirements,
          lockedStep,
          setLockedStep,
          visRef,
          setVisRef,
          dataset,
          setDataset,
          draftMeta,
          setDraftMeta,
        }}
      >
        <ISCWorkspace
          title={routeId ? "Edit ISC" : "ISC Creator"}
          breadcrumbs={[
            { label: "Home", to: "/", onClick: guardCrumb("/") },
            { label: "My ISCs", to: "/isc", onClick: guardCrumb("/isc") },
          ]}
          stepper={
            <WorkflowStepper
              steps={workflowSteps}
              current={currentStep}
              onStepSelect={handleSelectStep}
            />
          }
        >
          <Stack gap={2}>
            <SpecifyRequirements />
            <ChoosePath />
            {lockedStep.visualization.step === LEGACY_STEP_CODE.FIRST_MIDDLE && (
              <Visualization />
            )}
            {lockedStep.dataset.step === LEGACY_STEP_CODE.SECOND_MIDDLE && (
              <Dataset />
            )}
            {lockedStep.dataset.step === LEGACY_STEP_CODE.FIRST_MIDDLE && (
              <Dataset />
            )}
            {lockedStep.visualization.step === LEGACY_STEP_CODE.SECOND_MIDDLE && (
              <Visualization />
            )}
            {lockedStep.visualization.step !== LEGACY_STEP_CODE.NONE &&
              lockedStep.dataset.step !== LEGACY_STEP_CODE.NONE && <Finalize />}
          </Stack>
        </ISCWorkspace>
      </ISCContext.Provider>
      <LeaveEditDialog
        open={Boolean(leaveTo)}
        saving={leaving}
        onSave={handleSaveAndLeave}
        onKeep={handleKeepAndLeave}
        onDiscard={handleDiscardAndLeave}
        onCancel={() => setLeaveTo(null)}
      />
    </>
  );
};

export default IndicatorSpecificationCard;
