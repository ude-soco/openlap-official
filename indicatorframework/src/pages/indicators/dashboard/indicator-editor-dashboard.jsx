import { useState } from "react";
import { Chip, Stack, Tab, Tabs } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";
import PageHeader from "../../../common/components/page-header/page-header.jsx";
import IndicatorDraftsTable from "./components/indicator-drafts-table.jsx";

const IndicatorEditorDashboard = () => {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "drafts" ? "drafts" : "saved";
  const [savedStats, setSavedStats] = useState({ total: 0 });
  const [draftStats, setDraftStats] = useState({ total: 0 });
  const stats = view === "drafts" ? draftStats : savedStats;
  return <Stack sx={{ gap: 2 }}>
    <PageHeader title="My Indicators" breadcrumbs={[{ label: "Home", to: "/" }]}
      subtitle="Create, review, and manage your indicators and private drafts."
      actions={<Chip icon={<InsightsOutlinedIcon />} variant="outlined" label={`${stats.total} ${view === "drafts" ? "draft" : "saved indicator"}${stats.total === 1 ? "" : "s"}`} />} />
    <Tabs value={view} onChange={(_event, next) => setParams(next === "drafts" ? { view: "drafts" } : {})} aria-label="Indicator status">
      <Tab value="saved" label="Saved indicators" /><Tab value="drafts" label="Drafts" />
    </Tabs>
    {view === "drafts" ? <IndicatorDraftsTable onStats={setDraftStats} /> : <MyIndicatorsTable onStats={setSavedStats} />}
  </Stack>;
};

export default IndicatorEditorDashboard;
