import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Upload events & missions",
};

/** `/add` hub consolidates into the upload intake page. */
export default function AddPage() {
  redirect("/upload");
}
