import { useContext, useEffect, useRef, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
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
import { ISCContext } from "./isc-context.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const IndicatorSpecificationCard = () => {
  const { SESSION_ISC } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { id: routeId } = useParams();
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
      let sessionISC = {
        id,
        requirements,
        dataset,
        visRef,
        lockedStep,
      };
      // TODO: Add date to the session
      sessionStorage.setItem(SESSION_ISC, JSON.stringify(sessionISC));

      // Check if any of the dependencies have changed
      if (
        prevDependencies.current.requirements !== requirements ||
        prevDependencies.current.dataset !== dataset ||
        prevDependencies.current.visRef !== visRef ||
        prevDependencies.current.lockedStep !== lockedStep
      ) {
        enqueueSnackbar("Draft saved", {
          variant: "info",
          autoHideDuration: 1000,
        });
      }

      // Update the previous dependencies to the current ones
      prevDependencies.current = {
        requirements,
        dataset,
        visRef,
        lockedStep,
      };
    }, 5000);

    return () => clearInterval(intervalId);
  }, [requirements, dataset, visRef, lockedStep]);

  // Derive the (informational) workflow-stepper view from the real runtime state
  // (lockedStep + completeness selectors). Pure read — does not affect gating.
  const domainState = { requirements, dataset, visRef, lockedStep };
  const workflowSteps = getWorkflowSteps(domainState);
  const currentStep = getCurrentStep(domainState);

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
        <ISCWorkspace
          title={routeId ? "Edit ISC" : "Create an ISC"}
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "My ISCs", to: "/isc" },
          ]}
          stepper={
            <WorkflowStepper steps={workflowSteps} current={currentStep} />
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
    </>
  );
};

export default IndicatorSpecificationCard;
