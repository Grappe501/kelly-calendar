import type { Metadata } from "next";
import { makeBoardPage } from "@/components/operations/makeBoardPage";

export const metadata: Metadata = { title: "Communications Manager" };
export const dynamic = "force-dynamic";
export default makeBoardPage(
  "communications",
  "Never label SENT without verified D20 dispatch evidence.",
);
