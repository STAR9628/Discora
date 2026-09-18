"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getSupabaseConfig } from "@/services/supabase/config";

/**
 * Phase 9C.4 — Account deletion Server Actions (Option C, Hybrid De-Identification).
 *
 * Trust model:
 * - The target account ALWAYS comes from the server session (getUser), never
 *   from client input (INVARIANT 3).
 * - The database RPC is service_role-only; browsers cannot invoke it (INVARIANT 2).
 * - Step-up is synchronous inside the final action: password re-entry for
 *   password accounts, native GoTrue email OTP for OAuth/no-password accounts.
 * - OTP proofs are short-lived (300s), single-use, user-bound server records —
 *   never in URLs (INVARIANTS 8/9).
 * - Errors surfaced to the client are neutral; details stay server-side without PII.
 */

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";
const OTP_WINDOW_SECONDS = 300;
const OTP_SENDS_PER_HOUR = 5;
const DELETION_REQUESTS_PER_DAY = 3;

export type StepUpMethod = "password" | "otp";

function serviceClient() {
  const { supabaseUrl } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Account deletion is not configured on this server.");
  }
  return createServerClient(supabaseUrl, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isolatedAnonClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const shown = local.slice(0, 2);
  return `${shown}***@${domain}`;
}

async function requireSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    throw new Error("Please sign in and try again.");
  }
  return { supabase, user };
}

async function checkDeletionRateLimit(admin: ReturnType<typeof serviceClient>, userId: string) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("deletion_operations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", dayAgo);
  if (error) {
    console.error("Deletion rate-limit check failed");
    throw new Error("Account deletion could not be completed. Please try again.");
  }
  if ((count ?? 0) >= DELETION_REQUESTS_PER_DAY) {
    throw new Error("Too many deletion requests. Please try again later.");
  }
}

function isOwnerAccount(userId: string): boolean {
  const ownerId = process.env.DISCORA_OWNER_USER_ID;
  return !!ownerId && ownerId === userId;
}

/** Which step-up path applies: password re-entry, or email OTP for OAuth/no-password accounts. */
export async function getDeletionStepUpMethod(): Promise<{ method: StepUpMethod; maskedEmail: string }> {
  const { user } = await requireSessionUser();
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  const method: StepUpMethod = providers.includes("email") ? "password" : "otp";
  return { method, maskedEmail: maskEmail(user.email!) };
}

/**
 * Sends a native GoTrue email OTP to the session user's address (magic-link OTP
 * channel with account creation disabled). Proven single-use mailbox proof;
 * verification happens inline in the final action — no reusable credential
 * escapes this server boundary.
 */
export async function requestDeletionOtp(): Promise<{ ok: true; maskedEmail: string }> {
  const { user } = await requireSessionUser();
  const admin = serviceClient();
  await checkDeletionRateLimit(admin, user.id);

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("deletion_step_up_proofs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("method", "otp")
    .gt("requested_at", hourAgo);
  if ((count ?? 0) >= OTP_SENDS_PER_HOUR) {
    throw new Error("Too many verification codes sent. Please try again later.");
  }

  const sender = isolatedAnonClient();
  const { error } = await sender.auth.signInWithOtp({ email: user.email!, options: { shouldCreateUser: false } });
  if (error) {
    console.error("Deletion OTP request failed");
    throw new Error("Could not send a verification code. Please try again.");
  }

  const { error: proofError } = await admin.from("deletion_step_up_proofs").insert({
    user_id: user.id,
    method: "otp",
  });
  if (proofError) {
    console.error("Deletion OTP proof record failed");
    throw new Error("Could not send a verification code. Please try again.");
  }
  return { ok: true, maskedEmail: maskEmail(user.email!) };
}

async function verifyPasswordStepUp(email: string, password: string, expectedUserId: string) {
  const verifier = isolatedAnonClient();
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });
  if (error || !data.user || data.user.id !== expectedUserId) {
    throw new Error("Your password was not recognized. Please try again.");
  }
  await verifier.auth.signOut().catch(() => {});
}

async function verifyOtpStepUp(admin: ReturnType<typeof serviceClient>, userId: string, email: string, otp: string) {
  const { data: proof } = await admin
    .from("deletion_step_up_proofs")
    .select("id, requested_at, consumed_at")
    .eq("user_id", userId)
    .eq("method", "otp")
    .is("consumed_at", null)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proof) {
    throw new Error("No active verification code. Please request a new one.");
  }
  const ageSeconds = (Date.now() - new Date(proof.requested_at).getTime()) / 1000;
  if (ageSeconds > OTP_WINDOW_SECONDS) {
    throw new Error("That code has expired. Please request a new one.");
  }
  const verifier = isolatedAnonClient();
  const { data, error } = await verifier.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
  if (error || !data.user || data.user.id !== userId) {
    throw new Error("That code was not recognized. Please try again.");
  }
  await admin.from("deletion_step_up_proofs").update({ consumed_at: new Date().toISOString() }).eq("id", proof.id);
  await verifier.auth.signOut().catch(() => {});
}

export async function deleteMyAccount(input: {
  phrase: string;
  password?: string;
  otp?: string;
}): Promise<{ ok: true }> {
  const { supabase, user } = await requireSessionUser();
  const userId = user.id;
  const admin = serviceClient();
  let operationId: string | null = null;

  const fail = async (message: string, opStatus?: "failed_terminal" | "retryable_failure"): Promise<never> => {
    if (operationId) {
      await admin
        .from("deletion_operations")
        .update({
          status: opStatus ?? "failed_terminal",
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operationId);
    }
    throw new Error(message);
  };

  try {
    // Pre-flight: rate limit, owner guard, confirmation phrase (all server-side).
    await checkDeletionRateLimit(admin, userId);
    if (isOwnerAccount(userId)) {
      throw new Error("This account cannot be deleted.");
    }
    if (input.phrase.trim() !== CONFIRM_PHRASE) {
      throw new Error("Confirmation phrase does not match.");
    }

    // Correlation row FIRST so every attempt (including failed step-ups) counts
    // against the 24-hour budget enforced above on subsequent attempts.
    const { data: op, error: opError } = await admin
      .from("deletion_operations")
      .insert({ user_id: userId, status: "requested" })
      .select("id")
      .single();
    if (opError || !op) throw new Error("Account deletion could not be completed. Please try again.");
    operationId = op.id as string;

    // Step-up (synchronous, same execution; nothing reusable escapes).
    // Failures are recorded on the operation row so brute-force step-up
    // attempts consume the 24-hour budget.
    const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
    try {
      if (providers.includes("email")) {
        if (!input.password) throw new Error("Your password was not recognized. Please try again.");
        await verifyPasswordStepUp(user.email!, input.password, userId);
      } else {
        if (!input.otp) throw new Error("A verification code is required. Please request a new one.");
        await verifyOtpStepUp(admin, userId, user.email!, input.otp);
      }
    } catch (error) {
      await fail(error instanceof Error ? error.message : "Verification failed. Please try again.");
    }
    await admin.from("deletion_step_up_proofs").insert({ user_id: userId, method: providers.includes("email") ? "password" : "otp", consumed_at: new Date().toISOString() });

    const { error: rpcError } = await admin.rpc("execute_account_deletion", {
      p_user_id: userId,
      p_operation_id: operationId,
    });
    if (rpcError) {
      const privileged = (rpcError.message || "").includes("privileged_account");
      await fail(privileged ? "This account cannot be deleted." : "Account deletion could not be completed. Please try again.", "failed_terminal");
    }

    // Auth ordering per spec: signOut (needs live JWT) BEFORE scrub/ban/soft-delete.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await admin.from("deletion_operations").update({ status: "auth_processing", updated_at: new Date().toISOString() }).eq("id", operationId);
    if (session?.access_token) {
      const { error: signOutError } = await admin.auth.admin.signOut(session.access_token, "global");
      if (signOutError) console.error("Deletion global sign-out failed; continuing with ban path");
    }
    await admin.from("deletion_operations").update({ auth_signout_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", operationId);

    const surrogateEmail = `deleted_${userId}@deleted.invalid`;
    const { error: scrubError } = await admin.auth.admin.updateUserById(userId, {
      email: surrogateEmail,
      email_confirm: true,
      phone: "",
      user_metadata: {},
      app_metadata: { provider: "email", providers: ["email"] },
      ban_duration: "876000h",
    } as Parameters<typeof admin.auth.admin.updateUserById>[1]);
    if (scrubError) {
      console.error("Deletion identity scrub failed");
      await fail("Account deletion could not be completed. Please try again.", "retryable_failure");
    }
    await admin.from("deletion_operations").update({ auth_scrub_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", operationId);

    const { error: softDeleteError } = await admin.auth.admin.deleteUser(userId, true);
    if (softDeleteError) {
      console.error("Deletion auth soft-delete failed");
      await fail("Account deletion could not be completed. Please try again.", "retryable_failure");
    }
    await admin.from("deletion_operations").update({ auth_soft_delete_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", operationId);

    // Storage: process verified-ownership queue rows inline (no worker infra in stack).
    await admin.from("deletion_operations").update({ status: "storage_pending", updated_at: new Date().toISOString() }).eq("id", operationId);
    const { data: queueRows } = await admin.from("storage_cleanup_queue").select("id, bucket, object_path, attempts").eq("user_id", userId).eq("status", "pending");
    for (const row of queueRows ?? []) {
      try {
        const { error: removeError } = await admin.storage.from(row.bucket as string).remove([row.object_path as string]);
        // Missing objects are idempotent success, not failure (already-cleanup race safe).
        if (removeError && !/not.?found/i.test(removeError.message)) throw removeError;
        await admin.from("storage_cleanup_queue").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", row.id);
      } catch {
        await admin
          .from("storage_cleanup_queue")
          .update({ status: "failed", attempts: ((row.attempts as number) ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }
    await admin.from("deletion_operations").update({ storage_cleanup_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", operationId);

    await admin.from("deletion_operations").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", operationId);
  } catch (error) {
    if (error instanceof Error && operationId && !/NEXT_REDIRECT/.test(error.message)) {
      // fail() already recorded terminal states; ensure unexpected errors land retryable.
      const { data: op } = await admin.from("deletion_operations").select("status").eq("id", operationId).single();
      if (op && (op.status === "requested" || op.status === "db_processing")) {
        await admin.from("deletion_operations").update({ status: "failed_terminal", updated_at: new Date().toISOString() }).eq("id", operationId);
      }
    }
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("Account deletion could not be completed. Please try again.");
  }

  // Server session teardown + cache purge, then leave settings.
  try {
    await supabase.auth.signOut();
  } catch {
    // Sessions already revoked globally; cookie cleanup is best-effort here.
  }
  revalidatePath("/", "layout");
  redirect("/");
}
