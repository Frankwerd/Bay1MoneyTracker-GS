/**
 * Creates a custom menu in the Google Sheets UI.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Financial Tracker')
    .addItem('Run Setup', 'runSetup')
    .addItem('Process Emails Now', 'processEmails')
    .addToUi();
}

/**
 * Sets up the required sheets, Gmail labels, and triggers.
 */
function runSetup() {
  setupSheets();
  setupLabels();
  setupTriggers();
  SpreadsheetApp.getUi().alert('Setup completed successfully!');
}

/**
 * Gets the spreadsheet by ID from properties or falls back to active/search.
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty(CONFIG.PROPERTY_KEYS.SPREADSHEET_ID);

  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      console.warn('Saved Spreadsheet ID is invalid or inaccessible. Searching...');
    }
  }

  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    const files = DriveApp.getFilesByName('Financial Tracker');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Financial Tracker');
    }
  }

  if (ss) {
    props.setProperty(CONFIG.PROPERTY_KEYS.SPREADSHEET_ID, ss.getId());
  }

  return ss;
}

/**
 * Ensures required sheets exist with headers.
 */
function setupSheets() {
  const ss = getSpreadsheet();

  // Initialize data sheets
  [CONFIG.SHEETS.EXPENSES, CONFIG.SHEETS.REVENUE].forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(CONFIG.HEADERS);
    }

    applyFormatting(sheet);
  });

  // Initialize profit sheet
  let profitSheet = ss.getSheetByName(CONFIG.SHEETS.PROFIT);
  if (!profitSheet) {
    profitSheet = ss.insertSheet(CONFIG.SHEETS.PROFIT);
  }
  setupProfitSheet(ss);
}

/**
 * Applies basic formatting to a sheet.
 */
function applyFormatting(sheet) {
  const headers = CONFIG.HEADERS;

  // Freeze header row and make bold
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Apply currency formatting to the 'Amount' column
  const amountColIndex = headers.indexOf('Amount') + 1;
  if (amountColIndex > 0) {
    sheet.getRange(2, amountColIndex, sheet.getMaxRows() - 1, 1).setNumberFormat('$#,##0.00');
  }

  // Apply alternating row colors (banding)
  const range = sheet.getRange(1, 1, sheet.getMaxRows(), headers.length);
  range.getBandings().forEach(banding => banding.remove());
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
}

/**
 * Sets up the summary on the Profit sheet.
 */
function setupProfitSheet(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PROFIT);
  if (!sheet) return;

  const expensesSheet = CONFIG.SHEETS.EXPENSES;
  const revenueSheet = CONFIG.SHEETS.REVENUE;
  const amountCol = 'E'; // Based on HEADERS: Date, Description, Category, Account, Amount, Link

  const summaryData = [
    ['Summary', ''],
    ['Total Revenue', `=SUM('${revenueSheet}'!${amountCol}:${amountCol})`],
    ['Total Expenses', `=SUM('${expensesSheet}'!${amountCol}:${amountCol})`],
    ['Net Profit', '=B2-B3']
  ];

  sheet.getRange(1, 1, summaryData.length, 2).setValues(summaryData);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  sheet.getRange(2, 2, 3, 1).setNumberFormat('$#,##0.00');
}

/**
 * Ensures required Gmail labels exist.
 */
function setupLabels() {
  const root = CONFIG.ROOT_LABEL;
  const categories = [CONFIG.CATEGORIES.EXPENSES, CONFIG.CATEGORIES.REVENUE];
  const statuses = [CONFIG.STATUSES.TO_PROCESS, CONFIG.STATUSES.PROCESSED, CONFIG.STATUSES.ERROR];

  categories.forEach(cat => {
    statuses.forEach(status => {
      const labelName = `${root}/${cat}/${status}`;
      getOrCreateLabel(labelName);
    });
  });
}

/**
 * Helper to get or create a Gmail label.
 */
function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}

/**
 * Sets up a time-driven trigger for processEmails.
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const triggerExists = triggers.some(t => t.getHandlerFunction() === 'processEmails');

  if (!triggerExists) {
    ScriptApp.newTrigger('processEmails')
      .timeBased()
      .everyHours(1)
      .create();
  }
}

/**
 * Processes emails in the "To Process" labels.
 */
function processEmails() {
  const categories = [CONFIG.CATEGORIES.EXPENSES, CONFIG.CATEGORIES.REVENUE];
  const ss = getSpreadsheet();
  
  if (!ss) {
    console.error('Spreadsheet not found. Please run setup.');
    return;
  }

  categories.forEach(cat => {
    const toProcessLabelName = `${CONFIG.ROOT_LABEL}/${cat}/${CONFIG.STATUSES.TO_PROCESS}`;
    const processedLabelName = `${CONFIG.ROOT_LABEL}/${cat}/${CONFIG.STATUSES.PROCESSED}`;
    const errorLabelName = `${CONFIG.ROOT_LABEL}/${cat}/${CONFIG.STATUSES.ERROR}`;
    
    const toProcessLabel = GmailApp.getUserLabelByName(toProcessLabelName);
    const processedLabel = GmailApp.getUserLabelByName(processedLabelName);
    const errorLabel = GmailApp.getUserLabelByName(errorLabelName);
    
    if (!toProcessLabel) return;
    
    const threads = toProcessLabel.getThreads();
    const sheetName = cat === CONFIG.CATEGORIES.EXPENSES ? CONFIG.SHEETS.EXPENSES : CONFIG.SHEETS.REVENUE;
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      console.error(`Sheet '${sheetName}' not found.`);
      return;
    }

    threads.forEach(thread => {
      try {
        const message = thread.getMessages()[thread.getMessageCount() - 1]; // Get latest message
        const data = parseEmailContent(message);
        
        sheet.appendRow([
          data.date,
          data.description,
          data.Proposed_Category,
          data.Proposed_Account,
          data.amount,
          thread.getPermalink()
        ]);
        
        thread.addLabel(processedLabel);
        thread.removeLabel(toProcessLabel);
      } catch (e) {
        console.error(`Error processing thread ${thread.getPermalink()}: ${e.message}`);
        thread.addLabel(errorLabel);
        thread.removeLabel(toProcessLabel);
      }
    });
  });
}
