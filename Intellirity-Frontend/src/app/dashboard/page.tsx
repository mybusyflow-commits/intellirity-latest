import { redirect } from "next/navigation";

/* Legacy path kept for bookmarks: the console is the real dashboard. */
export default function DashboardPage() {
  redirect("/console");
}
