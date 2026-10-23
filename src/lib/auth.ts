import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/lib/supabase/types";

/** Returns the signed-in user or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the signed-in user, redirecting to /login if absent. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Returns the user's default (first) workspace. The signup trigger creates one
 * automatically; this is a safety net if that trigger didn't run.
 */
export async function requireWorkspace(): Promise<Workspace> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data) return data as Workspace;

  // Fallback: create a workspace if the bootstrap trigger is absent.
  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name: "My workspace" })
    .select("*")
    .single();

  if (error) throw new Error(`Could not resolve a workspace: ${error.message}`);
  return created as Workspace;
}
