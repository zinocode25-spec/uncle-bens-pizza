import { supabase } from "./supabaseClient.js";

export async function fetchData(
  table,
  { select = "*", filters = [], orderBy = { column: "created_at", ascending: false } } = {}
) {
  let query = supabase.from(table).select(select);

  filters.forEach(({ column, operator = "eq", value }) => {
    if (value === undefined || value === null) return;
    query = query[operator](column, value);
  });

  if (orderBy?.column) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteItem(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function updateStatus(table, id, payload) {
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
  return true;
}

export function applyFilters(data, predicate) {
  if (typeof predicate !== "function") return data;
  return data.filter(predicate);
}

