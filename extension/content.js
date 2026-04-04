// -------------------------------
// Extract data using aria-label
// -------------------------------
window.getSheetData = function () {
  const cells = document.querySelectorAll('[role="gridcell"]');

  if (!cells.length) {
    return { error: "No data found — make sure sheet has data" };
  }

  // Build a map: { rowIndex: { colIndex: value } }
  const grid = {};
  let maxCol = 0;

  cells.forEach(cell => {
    const label = cell.getAttribute("aria-label");
    if (!label) return;

    // aria-label format: "A1 Age" or "B2 50000"
    const match = label.match(/^([A-Z]+)(\d+)\s*(.*)/);
    if (!match) return;

    const col = match[1];   // "A", "B", "C"
    const row = parseInt(match[2]);  // 1, 2, 3
    const value = match[3].trim();   // "Age", "50000"

    if (!grid[row]) grid[row] = {};
    grid[row][col] = value;
  });

  // Sort rows numerically
  const rowNumbers = Object.keys(grid)
    .map(Number)
    .sort((a, b) => a - b);

  if (rowNumbers.length < 2) {
    return { error: "Not enough rows found in sheet" };
  }

  // Get all column letters and sort alphabetically
  const allCols = new Set();
  rowNumbers.forEach(r => {
    Object.keys(grid[r]).forEach(c => allCols.add(c));
  });

  // Sort columns: A, B, C... AA, AB...
  const sortedCols = Array.from(allCols).sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });

  // First row = headers
  const headers = sortedCols.map(col => grid[rowNumbers[0]][col] || "");

  if (headers.filter(h => h !== "").length < 2) {
    return { error: "Could not read headers — make sure row 1 has column names" };
  }

  // Build data rows
  const data = rowNumbers.slice(1).map(rowNum => {
    const obj = {};
    sortedCols.forEach((col, i) => {
      const header = headers[i];
      if (!header) return;
      const val = grid[rowNum]?.[col] ?? "";
      obj[header] = val !== "" && !isNaN(val) ? Number(val) : val;
    });
    return obj;
  });

  // Remove empty rows
  const cleaned = data.filter(row =>
    Object.values(row).some(v => v !== "" && v !== null)
  );

  if (cleaned.length < 5) {
    return { error: `Only ${cleaned.length} rows found — need at least 5` };
  }

  return { data: cleaned };
};

// -------------------------------
// Listen for popup messages
// -------------------------------
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "GET_SHEET_DATA") {
      const result = window.getSheetData();
      sendResponse(result);
    }
    return true;
  }
);