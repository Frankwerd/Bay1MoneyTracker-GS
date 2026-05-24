# Google Apps Script Financial Tracker

Automate your expense and revenue tracking by linking Gmail notifications to a Google Spreadsheet.

## Features

- **Automated Setup**: One-click creation of necessary Sheets and Gmail labels.
- **State Management**: Uses Gmail labels (`To Process`, `Processed`, `Error`) to track the status of every transaction.
- **Enhanced Parsing**: Specific regex support for Google Workspace payments (monthly account costs and domain renewals).
- **Scheduled Processing**: Automated hourly processing via Google Apps Script triggers.
- **Custom UI**: Integrates directly into the Google Sheets menu.

## Setup Instructions

1.  **Open Google Sheets**: Create a new Google Sheet.
2.  **Open Apps Script**: Go to `Extensions` > `Apps Script`.
3.  **Add Files**: Copy the contents of `Config.gs`, `Main.gs`, `Parsers.gs`, and `appsscript.json` into the editor.
4.  **Run Setup**:
    - Refresh the Google Sheet.
    - Go to the new `Financial Tracker` menu.
    - Click `Run Setup`.
    - Authorize the script when prompted.
5.  **Start Tracking**: Apply the `BlueVine (6118)/Expenses/To Process` or `BlueVine (6118)/Revenue/To Process` label to any relevant emails in your Gmail.

## Project Structure

- `Config.gs`: Centralized configuration for labels, sheet names, and headers.
- `Main.gs`: Main entry point containing the UI logic, setup routines, and the core processing loop.
- `Parsers.gs`: specialized extraction logic for different email formats.
- `appsscript.json`: Manifest file defining required OAuth scopes.

## Gmail Label Hierarchy

```text
BlueVine (6118)
├── Expenses
│   ├── To Process
│   ├── Processed
│   └── Error
└── Revenue
    ├── To Process
    ├── Processed
    └── Error
```

## Parsing Logic

The script currently includes a specialized parser for:
- **Google Workspace**: Extracts domain name and dollar amounts from payment receipts.
- **General Fallback**: Attempts to extract the first dollar amount and the first line of text for any other emails.

## License

MIT
