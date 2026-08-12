import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MoneyOwedManager } from "@/components/money-owed/money-owed-manager";
import { fetchDebtView, listPeople } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Money Owed" };

export default async function MoneyOwedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const [debtView, people] = await Promise.all([
    fetchDebtView(supabase, user.id),
    listPeople(supabase, user.id),
  ]);

  return (
    <div>
      <MoneyOwedManager
        toReceive={debtView.entries.filter((entry) => entry.direction === "to_receive")}
        toPay={debtView.entries.filter((entry) => entry.direction === "to_pay")}
        settlementsByDebt={debtView.settlementsByDebt}
        people={people}
      />
    </div>
  );
}