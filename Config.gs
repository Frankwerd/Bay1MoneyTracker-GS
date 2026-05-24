/**
 * Configuration constants for Gmail labels and Spreadsheet sheets.
 */
const CONFIG = {
  ROOT_LABEL: 'BlueVine (6118)',
  CATEGORIES: {
    EXPENSES: 'Expenses',
    REVENUE: 'Revenue'
  },
  STATUSES: {
    TO_PROCESS: 'To Process',
    PROCESSED: 'Processed',
    ERROR: 'Error'
  },
  SHEETS: {
    EXPENSES: 'Expenses',
    REVENUE: 'Revenue',
    PROFIT: 'Profit'
  },
  PROPERTY_KEYS: {
    SPREADSHEET_ID: 'SPREADSHEET_ID'
  },
  HEADERS: ['Date', 'Description', 'Proposed_Category', 'Proposed_Account', 'Amount', 'Thread Link']
};
