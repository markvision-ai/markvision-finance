import { supabaseAdmin } from "@/integrations/supabase/client.server";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s_-]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 50) || "other";
}

function titleize(slug: string): string {
  const s = slug.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Resolve a category id for the user by slug or free-form name.
 * If no match is found, auto-creates a new category so the entry
 * always lands in the correct bucket on the site.
 */
export async function resolveCategoryId(
  table: "expense_categories" | "income_categories",
  userId: string,
  opts: { slug?: string | null; name?: string | null },
): Promise<{ id: string | null; name: string } | { id: null; name: "" }> {
  const rawSlug = opts.slug?.trim() || (opts.name ? slugify(opts.name) : "");
  if (!rawSlug) return { id: null, name: "" };
  const slug = slugify(rawSlug);

  // 1. exact slug match
  const { data: bySlug } = await supabaseAdmin
    .from(table)
    .select("id, name")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();
  if (bySlug) return { id: bySlug.id, name: bySlug.name };

  // 2. fuzzy name match (case-insensitive)
  if (opts.name) {
    const { data: byName } = await supabaseAdmin
      .from(table)
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", opts.name.trim())
      .maybeSingle();
    if (byName) return { id: byName.id, name: byName.name };
  }

  // 3. auto-create
  const name = opts.name?.trim() || titleize(slug);
  const color = table === "income_categories" ? "#10b981" : "#6b7280";
  const { data: created, error } = await supabaseAdmin
    .from(table)
    .insert({ user_id: userId, name, slug, color })
    .select("id, name")
    .single();
  if (error || !created) {
    console.error("[resolve-category] create failed", error?.message);
    return { id: null, name: "" };
  }
  return { id: created.id, name: created.name };
}