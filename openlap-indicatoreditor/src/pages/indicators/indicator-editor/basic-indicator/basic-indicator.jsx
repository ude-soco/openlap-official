import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import { useSnackbar } from "notistack";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid2";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import dayjs from "dayjs";
import { Condition } from "../utils/indicator-data";
import Dataset from "./components/dataset/dataset";
import Filters from "./components/filters/filters";

export const BasicContext = createContext(undefined);

const SESSION = "session_indicator";

export default function BasicIndicator() {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? {
          ...JSON.parse(savedState).indicator,
          previewData: {
            displayCode: [],
            scriptData: "",
          },
        }
      : {
          previewData: {
            displayCode: [],
            scriptData: "",
          },
          indicatorName: "",
          type: "BASIC",
        };
  });
  const [dataset, setDataset] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? {
          ...JSON.parse(savedState).dataset,
        }
      : {
          myLRSList: [],
          selectedLRSList: [],
        };
  });

  const [filters, setFilters] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? {
          ...JSON.parse(savedState).filters,
        }
      : {
          selectedUserFilter: Condition.only_me,
          selectedTime: {
            from: dayjs().subtract(1, "year").toISOString(),
            until: dayjs().toISOString(),
          },
          activityTypesList: [],
          selectedActivities: [
            // {activityType: {}, actionOnActivityList: [], selectedActionOnActivity: [{}], activities: [{}]}
          ],
        };
  });

  const [indicatorQuery, setIndicatorQuery] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).indicatorQuery
      : {
          lrsStores: [],
          platforms: [],
          activityTypes: [],
          activities: {},
          actionOnActivities: [],
          duration: {
            from: dayjs().subtract(1, "year").toISOString(),
            until: dayjs().toISOString(),
          },
          outputs: [],
          userQueryCondition: Condition.only_me,
        };
  });
  const [analysisRef, setAnalysisRef] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).analysisRef
      : {
          analyticsTechniqueId: "",
          analyticsTechniqueParams: [],
          analyticsTechniqueMapping: {
            mapping: [],
          },
          analyzedData: {},
        };
  });
  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).visRef
      : {
          visualizationLibraryId: "",
          visualizationTypeId: "",
          visualizationParams: {
            height: 500,
            width: 500,
          },
          visualizationMapping: {
            mapping: [],
          },
        };
  });
  const [analysisInputMenu, setAnalysisInputMenu] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).analysisInputMenu
      : {
          activities: {
            id: undefined,
            type: "Text",
            required: true,
            title: "Activities",
            description:
              "Selected list of all the Activities specified in Activity Filter. " +
              'E.g. courses that are selected in Activity name section are "Learning Analytics", "Data Mining" etc.',
            options: [],
          },
          activityTypes: {
            id: "statement.object.definition.type",
            type: "Text",
            required: true,
            title: "Activity Types",
            description: "Types of activities",
          },
          actionOnActivities: {
            id: undefined,
            type: "Text",
            required: true,
            title: "Actions",
            description:
              "Selected list of actions performed on the activity(ies). E.g. a list of actions that were " +
              'performed on a course such as "viewed", "enrolled" etc.',
            options: [],
          },
          platforms: {
            id: "statement.context.platform",
            type: "Text",
            required: true,
            title: "Platforms",
            description:
              'Selected list of sources specified in Dataset such as "Moodle" etc.',
          },
          // user: {
          //   id: "statement.actor.account.name",
          //   type: "Text",
          //   required: true,
          //   title: "Users",
          //   description:
          //     "Selected list of the User(s) specified in User Filter",
          // },
        };
  });
  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem(SESSION);
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          dataset: {
            locked: false,
            openPanel: true,
            step: "1",
          },
          filters: {
            locked: true,
            openPanel: false,
            step: "2",
          },
          analysis: {
            locked: true,
            openPanel: false,
            step: "3",
          },
          visualization: {
            locked: true,
            openPanel: false,
            step: "4",
          },
          finalize: {
            locked: true,
            openPanel: false,
            step: "5",
          },
        };
  });

  const prevDependencies = useRef({
    indicatorQuery,
    analysisRef,
    visRef,
    analysisInputMenu,
    lockedStep,
    indicator,
    dataset,
    filters,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session = {
        indicatorQuery,
        analysisRef,
        visRef,
        analysisInputMenu,
        indicator,
        lockedStep,
        dataset,
        filters,
      };

      sessionStorage.setItem(SESSION, JSON.stringify(session));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.indicatorQuery !== indicatorQuery ||
        prevDependencies.current.analysisRef !== analysisRef ||
        prevDependencies.current.visRef !== visRef ||
        prevDependencies.current.analysisInputMenu !== analysisInputMenu ||
        prevDependencies.current.lockedStep !== lockedStep ||
        prevDependencies.current.indicator !== indicator ||
        prevDependencies.current.dataset !== dataset ||
        prevDependencies.current.filters !== filters
      ) {
        enqueueSnackbar("Autosaved", { variant: "success" });
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        indicatorQuery,
        analysisRef,
        visRef,
        analysisInputMenu,
        lockedStep,
        indicator,
        dataset,
        filters,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [
    indicatorQuery,
    analysisRef,
    visRef,
    analysisInputMenu,
    lockedStep,
    indicator,
    dataset,
    filters,
  ]);

  return (
    <>
      <BasicContext.Provider
        value={{
          indicatorQuery,
          analysisRef,
          visRef,
          analysisInputMenu,
          lockedStep,
          indicator,
          dataset,
          filters,
          setIndicatorQuery,
          setAnalysisRef,
          setVisRef,
          setAnalysisInputMenu,
          setLockedStep,
          setIndicator,
          setDataset,
          setFilters,
        }}
      >
        <Grid container spacing={2}>
          <Breadcrumbs>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/"
            >
              Home
            </Link>
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/indicator"
            >
              Indicator Dashboard
            </Link>

            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/indicator/editor"
            >
              Create an Indicator
            </Link>
            <Typography sx={{ color: "text.primary" }}>
              Basic Indicator
            </Typography>
          </Breadcrumbs>
          <Grid size={{ xs: 12 }}>
            <Dataset />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Filters />
          </Grid>
        </Grid>
      </BasicContext.Provider>
    </>
  );
}
