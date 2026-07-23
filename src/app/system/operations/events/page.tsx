import type { Metadata } from "next";
import { makeBoardPage } from "@/components/operations/makeBoardPage";

export const metadata: Metadata = { title: "Events operations" };
export const dynamic = "force-dynamic";
export default makeBoardPage(
  "events",
  "Operational board — not a separate Event database.",
);
