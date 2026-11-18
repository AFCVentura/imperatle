import VisualCompare from "./VisualCompare";

// Dev only (the dev layout 404s in production): the real pages side by side,
// one phone per look, to pick the outlines, weights and colours.
export default function Page() {
  return <VisualCompare />;
}
