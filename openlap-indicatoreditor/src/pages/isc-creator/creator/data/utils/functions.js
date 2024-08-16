export function isNullOrEmpty(value) {
  return value === null || (typeof value === "string" && value.trim() === "");
}
