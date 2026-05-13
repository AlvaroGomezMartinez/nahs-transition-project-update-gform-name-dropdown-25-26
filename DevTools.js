/**
 * @fileoverview DevTools — Manual debugging and validation helpers
 *
 * Contains utility functions for verifying configuration and testing the
 * data pipeline without modifying live form data. These functions are
 * intended to be run manually from the Apps Script editor and are never
 * attached to triggers.
 *
 * How to run a function:
 *   1. Open the Apps Script editor
 *   2. Select the function name from the dropdown at the top of the toolbar
 *   3. Click Run
 *   4. View output in the Execution Log panel (View → Logs)
 *
 */

/**
 * Validates that all required Script Properties are set and that the script
 * can successfully reach both the source spreadsheet and the target form.
 * Also runs a small sample through the data processing pipeline to confirm
 * end-to-end formatting works correctly.
 *
 * Safe to run at any time — does not modify any data.
 *
 * @returns {void}
 */
function testConfiguration() {
  console.log('--- testConfiguration start ---');

  try {
    // Verify spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    const sheet       = spreadsheet.getSheetByName(CONFIG.SPREADSHEET.SHEET_NAME);

    if (!sheet) throw new Error(`Sheet "${CONFIG.SPREADSHEET.SHEET_NAME}" not found.`);
    console.log(`✓ Spreadsheet OK — sheet has ${sheet.getLastRow()} rows.`);

    // Verify form access
    const form     = FormApp.openById(CONFIG.FORM.ID);
    const formItem = form.getItemById(Number(CONFIG.FORM.QUESTION_ID));

    if (!formItem) throw new Error(`Form item ID ${CONFIG.FORM.QUESTION_ID} not found.`);
    console.log(`✓ Form OK — question type: ${formItem.getType()}`);

    // Verify data processing with a small sample (up to 5 rows)
    const sampleRows = sheet.getRange(
      CONFIG.SPREADSHEET.DATA_START_ROW,
      2,
      Math.min(5, sheet.getLastRow() - 1),
      4
    ).getValues();

    const processed = processStudentData(sampleRows);
    console.log(`✓ Data processing OK — sample: ${processed.slice(0, 3).join(' | ')}`);

    console.log('✓ All checks passed.');

  } catch (error) {
    console.error('✗ testConfiguration failed:', error);
  }

  console.log('--- testConfiguration end ---');
}

/**
 * Runs the full data pipeline (fetch → process → format) and logs what
 * would be written to the form dropdown, without making any changes.
 *
 * Use this to preview the output or diagnose data issues before a live run.
 *
 * @returns {void}
 */
function dryRun() {
  console.log('--- dryRun start ---');

  try {
    const studentData      = getStudentData();
    const formattedChoices = processStudentData(studentData);

    console.log(`Records processed : ${studentData.length}`);
    console.log(`Unique choices    : ${formattedChoices.length}`);
    console.log('First 10 choices:');

    formattedChoices.slice(0, 10).forEach((choice, i) => {
      console.log(`  ${i + 1}. ${choice}`);
    });

    if (formattedChoices.length > 10) {
      console.log(`  ... and ${formattedChoices.length - 10} more.`);
    }

  } catch (error) {
    console.error('dryRun failed:', error);
  }

  console.log('--- dryRun end ---');
}
