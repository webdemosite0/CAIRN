import { RemindersView } from "./reminders-view";
import { listReminders } from "@/app/actions/reminders";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Reminders" };

export default async function TasksPage() {
  const user = await currentUser();
  const reminders = await listReminders();
  return <RemindersView initial={reminders} signedIn={Boolean(user)} />;
}
