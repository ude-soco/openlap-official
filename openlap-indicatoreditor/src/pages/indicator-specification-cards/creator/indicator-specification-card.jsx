import { createContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Breadcrumbs,
  Button,
  Divider,
  Fade,
  Link,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink } from "react-router-dom";
import { useSnackbar } from "notistack";
import { v4 as uuidv4 } from "uuid";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SpecifyRequirements from "./components/specify-requirements/specify-requirements.jsx";
import ChoosePath from "./components/choose-path/choose-path.jsx";
import Visualization from "./components/visualization/visualization.jsx";
import Dataset from "./components/dataset/dataset.jsx";
import Finalize from "./components/finalize/finalize.jsx";
import { DataTypes } from "./utils/data/config.js";

export const ISCContext = createContext(undefined);

const IndicatorSpecificationCard = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [savedState, setSaveState] = useState(false);
  const [id, setId] = useState(() => {
    const savedState = sessionStorage.getItem("session_isc");
    return savedState
      ? JSON.parse(savedState).id
        ? JSON.parse(savedState).id
        : null
      : null;
  });

  const [requirements, setRequirements] = useState(() => {
    const savedState = sessionStorage.getItem("session_isc");
    return savedState
      ? JSON.parse(savedState).requirements
      : {
          goalType: {
            verb: "",
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
    const savedState = sessionStorage.getItem("session_isc");
    return savedState
      ? JSON.parse(savedState).dataset
      : {
          file: { name: "" },
          rows: [],
          columns: [],
        };
  });

  const [visRef, setVisRef] = useState(() => {
    const savedState = sessionStorage.getItem("session_isc");
    return savedState
      ? JSON.parse(savedState).visRef
      : {
          filter: {
            type: "",
          },
          chart: {
            type: "",
          },
          data: {
            series: [],
            options: {},
            axisOptions: {
              selectedXAxis: "",
              selectedYAxis: "",
              selectedLabel: "", // * StackedBar/Line
              selectedBarValue: "", // * StackedBar/Line
              selectedCategory: "", // * TreeMap
              selectedXValue: "", // * TreeMap
              selectedValue: "", // * TreeMap
              xAxisOptions: [],
              yAxisOptions: [],
              labelOptions: [], // * StackedBar/Line
              barValueOptions: [], // * StackedBar/Line
              categoryOptions: [], // * TreeMap
              xValueOptions: [], // * TreeMap
              valueOptions: [], // * TreeMap
            },
          },
          edit: false,
        };
  });

  const [lockedStep, setLockedStep] = useState(() => {
    const savedState = sessionStorage.getItem("session_isc");
    return savedState
      ? JSON.parse(savedState).lockedStep
      : {
          requirements: {
            locked: false,
            openPanel: true,
            step: "1",
          },
          path: { locked: true, openPanel: false, step: "2" },
          visualization: {
            locked: true,
            openPanel: false,
            step: "0",
          },
          dataset: {
            locked: true,
            openPanel: false,
            step: "0",
          },
          finalize: {
            locked: true,
            openPanel: false,
            step: "5",
          },
        };
  });

  const prevDependencies = useRef({
    requirements,
    dataset,
    visRef,
    lockedStep,
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      let session_isc = {
        id,
        requirements,
        dataset,
        visRef,
        lockedStep,
      };
      // TODO: Add date to the session
      sessionStorage.setItem("session_isc", JSON.stringify(session_isc));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.requirements !== requirements ||
        prevDependencies.current.dataset !== dataset ||
        prevDependencies.current.visRef !== visRef ||
        prevDependencies.current.lockedStep !== lockedStep
      ) {
        setSaveState(true);
        setTimeout(() => {
          setSaveState(false);
        }, 3000);
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        requirements,
        dataset,
        visRef,
        lockedStep,
      };
    }, 3000);

    return () => clearInterval(intervalId);
  }, [requirements, dataset, visRef, lockedStep]);

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
              to="/isc"
            >
              ISC Dashboard
            </Link>
            <Typography sx={{ color: "text.primary" }}>ISC Creator</Typography>
          </Breadcrumbs>

          <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
            <Divider />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Grid
              container
              justifyContent={savedState ? "space-between" : "flex-end"}
              spacing={1}
              sx={{ mr: 2 }}
            >
              <Fade
                in={savedState}
                timeout={{ enter: 500, exit: 300 }}
                unmountOnExit
              >
                <Grid size="grow">
                  <Alert>Draft autosaved</Alert>
                </Grid>
              </Fade>

              <Button startIcon={<RestartAltIcon />} color="error">
                Restart
              </Button>
            </Grid>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <SpecifyRequirements />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ChoosePath />
          </Grid>
          {lockedStep.visualization.step === "3" && (
            <Grid size={{ xs: 12 }}>
              <Visualization />
            </Grid>
          )}
          {lockedStep.dataset.step === "4" && (
            <Grid size={{ xs: 12 }}>
              <Dataset />
            </Grid>
          )}
          {lockedStep.dataset.step === "3" && (
            <Grid size={{ xs: 12 }}>
              <Dataset />
            </Grid>
          )}
          {lockedStep.visualization.step === "4" && (
            <Grid size={{ xs: 12 }}>
              <Visualization />
            </Grid>
          )}
          {lockedStep.visualization.step !== "0" &&
            lockedStep.dataset.step !== "0" && (
              <Grid size={{ xs: 12 }}>
                <Finalize />
              </Grid>
            )}
        </Grid>
      </ISCContext.Provider>
    </>
  );
};

export default IndicatorSpecificationCard;
