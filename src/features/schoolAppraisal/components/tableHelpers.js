//for detecting if a column is a serial number column, and for adding a serial number column if not present
export const serialColumnFor = (columns) =>
  columns.find((column) => /^(sr\.?\s*no\.?|s\.?no|sn|sl\.?\s*no\.?)$/i.test(column.trim()));

export const columnsWithSerial = (columns) => {
  if (serialColumnFor(columns)) return columns;
  return ["Sr No", ...columns];
};
