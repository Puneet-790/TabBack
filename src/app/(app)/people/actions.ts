"use server";

import { revalidatePath } from "next/cache";
import {
  createPerson,
  deletePerson,
  fetchPersonReferences,
  listPeople,
  updatePerson,
} from "@/lib/data";
import type { PersonFields } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

export interface PersonActionState {
  ok?: boolean;
  id?: string;
  error?: string;
}

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

function personFieldsFrom(formData: FormData): PersonFields {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
}

export async function createPersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  try {
    const existing = await listPeople(current.supabase, current.user.id);
    const person = await createPerson(
      current.supabase,
      current.user.id,
      personFieldsFrom(formData),
      existing,
    );
    revalidatePath("/people");
    return { ok: true, id: person.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add the person" };
  }
}

export async function updatePersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const personId = String(formData.get("id") ?? "");
  if (!personId) return { error: "Person not found" };
  try {
    const existing = await listPeople(current.supabase, current.user.id);
    await updatePerson(
      current.supabase,
      current.user.id,
      personId,
      personFieldsFrom(formData),
      existing,
    );
    revalidatePath("/people");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the person" };
  }
}

export async function deletePersonAction(
  _prev: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const personId = String(formData.get("id") ?? "");
  if (!personId) return { error: "Person not found" };
  try {
    const references = await fetchPersonReferences(current.supabase, current.user.id, personId);
    await deletePerson(current.supabase, current.user.id, personId, references);
    revalidatePath("/people");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete the person" };
  }
}