import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/config/server-env";
import type { ApplicationDatabase as Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const environment = getServerEnvironment();

  return createClient<Database>(
    environment.supabaseUrl,
    environment.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
