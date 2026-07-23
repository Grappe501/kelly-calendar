import type { Metadata } from "next";
import { makeBoardPage } from "@/components/operations/makeBoardPage";

export const metadata: Metadata = { title: "Volunteer Manager" };
export const dynamic = "force-dynamic";
export default makeBoardPage("volunteers");
