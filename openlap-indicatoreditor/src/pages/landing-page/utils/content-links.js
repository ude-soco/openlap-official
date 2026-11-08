// Shared by public cards and previews. Content links never execute script/data URLs.
export const contentHref = (value) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};

export const formatNewsDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "Date not set";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "Date not set";
  }
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
};
