# NAHS AEP Transition Plan — Form Dropdown Manager

Automatically keeps the student name dropdown in the **AEP Transition Plan - Academic & Behavioral Progress Teacher Notes** Google Form in sync with the NAHS Student Transition Notes spreadsheet. Runs on a time-based trigger every 5 minutes.

---

## About This Script

This is a **bound Google Apps Script** — it lives inside the Google Form itself, not as a standalone Apps Script project. You access it through the form's script editor (Extensions → Apps Script) rather than directly at script.google.com.

The script reads student records from a Google Sheet, formats each one as `Last, First (StudentID) Grade: X`, and writes the full list to the form's dropdown question. Duplicate entries are removed and choices are sorted alphabetically before being written.

---

## Project Structure

```
├── Code.js           # Production script — data pipeline and form update logic
├── DevTools.js       # Manual-run helpers for testing and validation (never triggered)
├── appsscript.json   # Apps Script manifest — OAuth scopes and runtime config
├── .clasp.json       # clasp config — links this repo to the Apps Script project
└── .claspignore      # Files excluded from clasp push (README, CHANGELOG, etc.)
```

---

## Configuration

Sensitive IDs are stored in **Script Properties** and never committed to source code. Set them once via the Apps Script UI:

1. Open the form → **Extensions → Apps Script**
2. Click the **gear icon (⚙️ Project Settings)** in the left sidebar
3. Scroll to **Script Properties** and click **Add script property**
4. Add the following three properties:

| Property | Value |
|---|---|
| `FORM_ID` | ID of the target Google Form |
| `FORM_QUESTION_ID` | Numeric ID of the dropdown question |
| `SPREADSHEET_ID` | ID of the source spreadsheet |

5. Click **Save script properties**

The script reads these at runtime via `PropertiesService.getScriptProperties()`. If any property is missing, the script throws a descriptive error rather than failing silently.

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) installed
- [clasp](https://github.com/google/clasp) installed globally: `npm install -g @google/clasp`
- Logged in to clasp: `clasp login`

### Clone and push

```bash
git clone <repo-url>
cd nahs-transition-project-update-gform-name-dropdown-25-26
clasp push
```

Because `.clasp.json` uses `"rootDir": "."`, clasp will push `Code.js`, `DevTools.js`, and `appsscript.json` to the bound script project automatically.

### Set Script Properties

Follow the Configuration steps above to add the three required properties in the Apps Script UI.

### Set up the time-based trigger

1. In the Apps Script editor, click the **clock icon (Triggers)** in the left sidebar
2. Click **Add Trigger** and configure:
   - Function: `populateDropdown`
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5 minutes
3. Click **Save** and authorize the requested permissions

### Verify the setup

Run `testConfiguration()` from the Apps Script editor to confirm all connections are working before the trigger fires for the first time.

---

## Permissions

The script requests the minimum scopes needed:

| Scope | Purpose |
|---|---|
| `spreadsheets` | Read student data from the source sheet |
| `forms` | Update dropdown choices in the form |
| `gmail.send` | Send failure notification emails to the script owner |

---

## Data Format

The script reads columns B–E starting at row 2 of the `TENTATIVE-Version2` sheet:

| Column | Field | Required |
|---|---|---|
| B | Last Name | Yes |
| C | First Name | Yes |
| D | Student ID | No |
| E | Grade | No |

Rows missing both a first and last name are skipped and logged. Fully empty rows are silently ignored.

### Dropdown output format

```
Last, First (StudentID) Grade: X
```

Example: `Smith, Jane (12345) Grade: 10`

StudentID and Grade are omitted from the string when not present in the sheet.

---

## Functions

### `Code.js` — Production

| Function | Description |
|---|---|
| `populateDropdown()` | Main entry point — orchestrates the full update cycle. Attach this to the trigger. |
| `getStudentData()` | Reads raw student rows from the spreadsheet |
| `processStudentData()` | Validates, formats, deduplicates, and sorts rows into choice strings |
| `updateFormDropdown()` | Writes the final choice list to the form dropdown |
| `notifyOnError()` | Emails the script owner when a critical failure occurs |

### `DevTools.js` — Manual use only

| Function | Description |
|---|---|
| `testConfiguration()` | Checks Script Properties, spreadsheet access, form access, and a sample data run. Does not modify anything. |
| `dryRun()` | Runs the full pipeline and logs what would be written to the form, without updating it. |

---

## Monitoring and Debugging

**View execution history:**
1. In the Apps Script editor, click **Executions** in the left sidebar
2. Click any execution to expand its log output
3. Look for `✓` lines from `testConfiguration()` or the summary line from `populateDropdown()`

**Error emails:**
If `populateDropdown()` throws an unhandled error, it sends an email to the account that owns the trigger with the error type, message, and timestamp.

---

## Troubleshooting

**"Missing required Script Properties"**
- One or more of `FORM_ID`, `FORM_QUESTION_ID`, or `SPREADSHEET_ID` is not set
- Go to Project Settings → Script Properties and verify all three are present

**"Sheet not found"**
- The sheet name in `Code.js` (`TENTATIVE-Version2`) doesn't match the actual tab name
- Update `SHEET_NAME` in `getConfig()` to match

**"Form item not found"**
- The `FORM_QUESTION_ID` Script Property doesn't match the dropdown question's ID
- Use `dryRun()` or check the form's question IDs via the Apps Script editor

**Permission errors**
- Re-authorize by running any function manually and accepting the permission prompt
- Confirm the account running the trigger has edit access to both the form and spreadsheet

**Dropdown not updating**
- Run `dryRun()` to confirm data is being read and formatted correctly
- Check the Executions panel for errors on recent trigger runs

---

## Version History

- **v2.1.0** (2026-05-13) — Moved IDs to Script Properties, split DevTools into separate file, removed unused scopes and Drive advanced service
- **v2.0.0** (2025-08-05) — Major refactoring with improved error handling, modular architecture, and JSDoc documentation
- **v1.0.0** (2024-12-10) — Initial implementation

---

## Related

- [nahs-25-26-student-transition-notes](https://github.com/AlvaroGomezMartinez/nahs-25-26-student-transition-notes) — bound script on the Google Sheet that this form feeds into
