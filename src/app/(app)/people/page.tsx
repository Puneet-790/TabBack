import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PeopleManager } from "@/components/people/people-manager";
import { listPeople, listRemindersForPerson, listSettlementsForPerson } from "@/lib/data";
import { filterPeopleBySearch } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const rawParams = await searchParams;
  const q = typeof rawParams.q === "string" ? rawParams.q : "";
  const people = await listPeople(supabase, user.id);
  const filtered = filterPeopleBySearch(people, q);
  const history = await Promise.all(
    people.map(async (person) => ({
      id: person.id,
      rows: await listSettlementsForPerson(supabase, user.id, person.id),
    })),
  );
  const reminders = await Promise.all(
    people.map(async (person) => ({
      id: person.id,
      rows: await listRemindersForPerson(supabase, user.id, person.id),
    })),
  );
  const settlements = Object.fromEntries(
    history.map((entry) => [entry.id, entry.rows]),
  ) as Record<string, typeof history[number]["rows"]>;
  const reminderLog = Object.fromEntries(
    reminders.map((entry) => [entry.id, entry.rows]),
  ) as Record<string, typeof reminders[number]["rows"]>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">People</h1>
          {q.trim() !== "" && filtered.length > 0 && (
            <p className="text-sm text-muted">
              {filtered.length} shown, filtered by your search
            </p>
          )}
        </div>
      </div>
      <PeopleManager people={filtered} q={q} settlements={settlements} reminders={reminderLog} />
    </div>
  );
}