import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const environment = getPublicEnvironment();

  return createBrowserClient<Database>(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );
}
