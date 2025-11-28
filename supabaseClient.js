import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://tgkiktklknwyohadenbd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2lrdGtsa253eW9oYWRlbmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzQ1OTAsImV4cCI6MjA3Nzk1MDU5MH0.74kBuL5I3aORpII7m6fsXavm6Kd1RaLy1byx4mqjnoc"
);

