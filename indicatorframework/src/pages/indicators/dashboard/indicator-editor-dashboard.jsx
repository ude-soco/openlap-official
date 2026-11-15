import { useState } from "react";
import { Chip, Stack } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";
import PageHeader from "../../../common/components/page-header/page-header.jsx";

const IndicatorEditorDashboard = () => {
  const [params, setParams] = useSearchParams();
  const draftsOnly = params.get("view") === "drafts";
  const [stats, setStats] = useState({ total: 0 });
  return <Stack sx={{ gap: 2 }}>
    <PageHeader title="My Indicators" breadcrumbs={[{ label: "Home", to: "/" }]}
      subtitle="Create, review, and manage your indicators and private drafts."
      actions={<Chip icon={<InsightsOutlinedIcon />} variant="outlined" label={`${stats.total} ${draftsOnly ? "draft" : "indicator"}${stats.total === 1 ? "" : "s"}`} />} />
    <MyIndicatorsTable onStats={setStats} draftsOnly={draftsOnly} onDraftsOnlyChange={(checked) => setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (checked) next.set("view", "drafts");
      else next.delete("view");
      return next;
    })} />
  </Stack>;
};

export default IndicatorEditorDashboard;
