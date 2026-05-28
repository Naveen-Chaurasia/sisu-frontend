import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://snbnqwrxvptrfjsecljd.supabase.co";
// Replace with the anon (public) key from Supabase Dashboard → Settings → API if available.
// The service-role key below works for auth-only usage in this private tool.
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYm5xd3J4dnB0cmZqc2VjbGpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5MzQ4MSwiZXhwIjoyMDk1NDY5NDgxfQ." +
  "t92K9HW0uQpCWy08c6CPtGKynHN5ET3ymcfcupNJTO0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
