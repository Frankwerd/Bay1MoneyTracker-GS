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
 * Ensures required sheets exist with headers.
 */
function setupSheets() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    // Fallback for when script is run standalone and not bound to a sheet
    const files = DriveApp.getFilesByName('Financial Tracker');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Financial Tracker');
    }
  }

  [CONFIG.SHEETS.EXPENSES, CONFIG.SHEETS.REVENUE].forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(CONFIG.HEADERS);
      sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setFontWeight('bold');
    }
  });
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
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    const files = DriveApp.getFilesByName('Financial Tracker');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      console.error('Active spreadsheet not found. Please run setup or ensure script is bound to a sheet.');
      return;
    }
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

