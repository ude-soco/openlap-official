// The analysis table uses the first column to determine its rows.
export const getAnalyzedRowCount = (columns = {}) => {
  const firstColumn = Object.values(columns ?? {})[0];
  return Array.isArray(firstColumn?.data) ? firstColumn.data.length : 0;
};
