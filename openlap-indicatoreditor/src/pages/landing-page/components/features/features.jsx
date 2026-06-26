import { navigationIds } from "../../utils/navigation-data";
import { featureItems } from "../../utils/features-data";
import Section from "../shared/section";
import SectionHeading from "../shared/section-heading";
import FeatureRow from "./feature-row";

export default function Features() {
  return (
    <>
      <Section id={navigationIds.FEATURE} sx={{ pt: { xs: 8, sm: 12 }, pb: 0 }}>
        <SectionHeading
          title="OpenLAP Features"
          subtitle="The Indicator Specification Card (ISC) Creator and the Indicator Editor"
        />
      </Section>
      {featureItems.map((feature) => (
        <FeatureRow key={feature.id} feature={feature} />
      ))}
    </>
  );
}
