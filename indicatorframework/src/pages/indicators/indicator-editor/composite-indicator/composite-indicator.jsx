import ComplexIndicator from "../complex-indicator/complex-indicator";
import { useParams } from "react-router-dom";

export default function CompositeIndicator() {
  const { id } = useParams();
  return <ComplexIndicator key={id || "new"} type="COMPOSITE" />;
}
