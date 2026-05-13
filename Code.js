/**
 * @fileoverview NAHS Student Transition Form Dropdown Manager
 *
 * Automatically populates the student name dropdown in the Google Form
 * "AEP Transition Plan - Academic & Behavioral Progress Teacher Notes"
 * with current student data pulled from the NAHS Student Transition Notes
 * spreadsheet. Intended to run on a time-based trigger.
 *
 * Required Script Properties (set via Project Settings → Script Properties):
 *   - FORM_ID           : ID of the target Google Form
 *   - FORM_QUESTION_ID  : Numeric ID of the dropdown question in the form
 *   - SPREADSHEET_ID    : ID of the source Google Spreadsheet
 *
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} StudentRecord
 * @property {string} lastName  - Student's last name (required)
 * @property {string} firstName - Student's first name (required)
 * @property {string} studentId - Student's ID number (optional)
 * @property {string} grade     - Student's grade level (optional)
 */

/**
 * @typedef {Object} Config
 * @property {{ID: string, QUESTION_ID: string}} FORM
 * @property {{ID: string, SHEET_NAME: string, DATA_START_ROW: number, COLUMNS: Object}} SPREADSHEET
 * @property {{MAX_RETRIES: number, RETRY_DELAY_MS: number}} PROCESSING
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Builds the runtime configuration object from Script Properties.
 *
 * Script Properties must be set manually via
 * Project Settings → Script Properties in the Apps Script UI.
 *
 * @returns {Config} The populated configuration object
 * @throws {Error} If any required Script Property is missing
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();

  const formId        = props.getProperty('FORM_ID');
  const questionId    = props.getProperty('FORM_QUESTION_ID');
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');

  if (!formId || !questionId || !spreadsheetId) {
    throw new Error(
      'Missing required Script Properties. ' +
      'Add FORM_ID, FORM_QUESTION_ID, and SPREADSHEET_ID via ' +
      'Project Settings → Script Properties in the Apps Script UI.'
    );
  }

  return {
    FORM: {
      ID:          formId,
      QUESTION_ID: questionId
    },
    SPREADSHEET: {
      ID:            spreadsheetId,
      SHEET_NAME:    'TENTATIVE-Version2',
      DATA_START_ROW: 2,
      COLUMNS: {
        LAST_NAME:  1, // Column B
        FIRST_NAME: 2, // Column C
        STUDENT_ID: 3, // Column D
        GRADE:      4  // Column E
      }
    },
    PROCESSING: {
      MAX_RETRIES:    3,
      RETRY_DELAY_MS: 1000
    }
  };
}

/** @type {Config} Loaded once at startup from Script Properties. */
const CONFIG = getConfig();

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Thrown when a Google Form operation fails.
 *
 * @extends Error
 */
class FormOperationError extends Error {
  /**
   * @param {string} message       - Human-readable error description
   * @param {string} operation     - Name of the operation that failed
   * @param {Error|null} originalError - Underlying error, if any
   */
  constructor(message, operation, originalError = null) {
    super(message);
    this.name          = 'FormOperationError';
    this.operation     = operation;
    this.originalError = originalError;
  }
}

/**
 * Thrown when a Google Sheets operation fails.
 *
 * @extends Error
 */
class SpreadsheetOperationError extends Error {
  /**
   * @param {string} message       - Human-readable error description
   * @param {string} operation     - Name of the operation that failed
   * @param {Error|null} originalError - Underlying error, if any
   */
  constructor(message, operation, originalError = null) {
    super(message);
    this.name          = 'SpreadsheetOperationError';
    this.operation     = operation;
    this.originalError = originalError;
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Orchestrates the full dropdown update cycle:
 * fetch student data → process → write to form.
 *
 * This is the function that should be attached to a time-based trigger.
 * On failure, an email notification is sent to the script owner and the
 * function returns false rather than throwing, so the trigger is not disabled.
 *
 * @returns {boolean} True if the dropdown was updated successfully, false otherwise
 */
function populateDropdown() {
  const startTime = new Date();

  try {
    console.log('Starting dropdown population process...');

    const studentData = getStudentData();

    if (!studentData || studentData.length === 0) {
      console.warn('No student data found. Dropdown will be cleared.');
      return updateFormDropdown([]);
    }

    const formattedChoices = processStudentData(studentData);
    const success          = updateFormDropdown(formattedChoices);

    const duration = (new Date() - startTime) / 1000;
    console.log(
      `Dropdown population completed in ${duration}s. ` +
      `Processed ${studentData.length} records, ` +
      `created ${formattedChoices.length} unique choices.`
    );

    return success;

  } catch (error) {
    console.error('Failed to populate dropdown:', error);
    notifyOnError(error);
    return false;
  }
}

// =============================================================================
// DATA RETRIEVAL
// =============================================================================

/**
 * Opens the configured spreadsheet and returns all student data rows
 * as a 2-D array of raw cell values (columns B–E, starting at DATA_START_ROW).
 *
 * @returns {Array<Array<*>>} Raw cell values; empty array if the sheet has no data rows
 * @throws {SpreadsheetOperationError} If the spreadsheet or sheet cannot be accessed
 */
function getStudentData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    const sheet       = spreadsheet.getSheetByName(CONFIG.SPREADSHEET.SHEET_NAME);

    if (!sheet) {
      throw new SpreadsheetOperationError(
        `Sheet "${CONFIG.SPREADSHEET.SHEET_NAME}" not found.`,
        'getSheet'
      );
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.SPREADSHEET.DATA_START_ROW) {
      console.warn('Sheet appears to be empty or has no data rows.');
      return [];
    }

    const numRows = lastRow - CONFIG.SPREADSHEET.DATA_START_ROW + 1;
    const numCols = Math.max(...Object.values(CONFIG.SPREADSHEET.COLUMNS));

    console.log(`Reading ${numRows} rows × ${numCols} columns from row ${CONFIG.SPREADSHEET.DATA_START_ROW}.`);

    const data = sheet
      .getRange(CONFIG.SPREADSHEET.DATA_START_ROW, 2, numRows, numCols)
      .getValues();

    console.log(`Retrieved ${data.length} rows.`);
    return data;

  } catch (error) {
    if (error instanceof SpreadsheetOperationError) throw error;
    throw new SpreadsheetOperationError('Failed to retrieve student data.', 'getData', error);
  }
}

// =============================================================================
// DATA PROCESSING
// =============================================================================

/**
 * Converts raw spreadsheet rows into a sorted, deduplicated array of
 * dropdown choice strings. Rows that fail validation are skipped and logged.
 *
 * @param {Array<Array<*>>} rawData - 2-D array of raw cell values from the spreadsheet
 * @returns {Array<string>} Alphabetically sorted, unique choice strings
 */
function processStudentData(rawData) {
  console.log(`Processing ${rawData.length} rows...`);

  const choices        = new Set();
  let   validRecords   = 0;
  let   skippedRecords = 0;

  rawData.forEach((row, index) => {
    try {
      const student = parseStudentRecord(row, index);

      if (!student) {
        skippedRecords++;
        return;
      }

      choices.add(formatStudentChoice(student));
      validRecords++;

    } catch (error) {
      console.error(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Error processing record:`, error);
      skippedRecords++;
    }
  });

  const sortedChoices = Array.from(choices).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  console.log(`Done: ${validRecords} valid, ${skippedRecords} skipped, ${sortedChoices.length} unique choices.`);

  return sortedChoices;
}

/**
 * Parses a single spreadsheet row into a {@link StudentRecord}.
 *
 * Returns null (without throwing) for rows that should be silently skipped:
 * - Fully empty rows
 * - Rows missing a first or last name
 *
 * @param {Array<*>} row   - Raw cell values for one spreadsheet row
 * @param {number}   index - Zero-based index of this row within rawData (used for log messages)
 * @returns {StudentRecord|null} Parsed student object, or null if the row should be skipped
 */
function parseStudentRecord(row, index) {
  const cols    = CONFIG.SPREADSHEET.COLUMNS;
  const student = {
    lastName:  sanitizeField(row[cols.LAST_NAME  - 1]),
    firstName: sanitizeField(row[cols.FIRST_NAME - 1]),
    studentId: sanitizeField(row[cols.STUDENT_ID - 1]),
    grade:     sanitizeField(row[cols.GRADE      - 1])
  };

  // Silently skip fully empty rows (common at the bottom of a sheet)
  if (!student.lastName && !student.firstName && !student.studentId && !student.grade) {
    return null;
  }

  // Warn and skip rows that have some data but are missing required name fields
  if (!student.lastName || !student.firstName) {
    console.warn(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Missing required name fields — skipped.`);
    return null;
  }

  return student;
}

/**
 * Coerces a raw cell value to a clean, single-spaced string.
 * Returns an empty string for null, undefined, or whitespace-only values.
 *
 * @param {*} value - Raw value from a spreadsheet cell
 * @returns {string} Trimmed, normalized string
 */
function sanitizeField(value) {
  if (value === null || value === undefined) return '';
  return value.toString().trim().replace(/\s+/g, ' ');
}

/**
 * Formats a {@link StudentRecord} into the dropdown choice string shown to form respondents.
 *
 * Format: "LastName, FirstName (StudentID) Grade: X"
 * StudentID and Grade are omitted when not present.
 *
 * @param {StudentRecord} student - Validated student record
 * @returns {string} Formatted choice string, e.g. "Smith, Jane (12345) Grade: 10"
 */
function formatStudentChoice(student) {
  const parts = [`${student.lastName}, ${student.firstName}`];
  if (student.studentId) parts.push(`(${student.studentId})`);
  if (student.grade)     parts.push(`Grade: ${student.grade}`);
  return parts.join(' ');
}

// =============================================================================
// FORM UPDATE
// =============================================================================

/**
 * Replaces all choices in the configured form dropdown with the provided list.
 * Passing an empty array clears the dropdown.
 *
 * Uses {@link retryOperation} to handle transient API failures.
 *
 * @param {Array<string>} choices - Formatted choice strings to write to the form
 * @returns {boolean} True if the update succeeded
 * @throws {FormOperationError} If the form item cannot be found, is the wrong type,
 *                              or the update fails after all retries
 */
function updateFormDropdown(choices) {
  try {
    const form     = FormApp.openById(CONFIG.FORM.ID);
    const formItem = form.getItemById(Number(CONFIG.FORM.QUESTION_ID));

    if (!formItem) {
      throw new FormOperationError(
        `Form item with ID ${CONFIG.FORM.QUESTION_ID} not found.`,
        'getFormItem'
      );
    }

    if (formItem.getType() !== FormApp.ItemType.LIST) {
      throw new FormOperationError(
        `Form item is not a dropdown/list type. Found: ${formItem.getType()}`,
        'validateItemType'
      );
    }

    return retryOperation(() => {
      formItem.asListItem().setChoiceValues(choices);
      console.log(`Dropdown updated with ${choices.length} choices.`);
      return true;
    }, 'updateDropdown');

  } catch (error) {
    if (error instanceof FormOperationError) throw error;
    throw new FormOperationError('Failed to update form dropdown.', 'updateForm', error);
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Executes a function, retrying on failure up to CONFIG.PROCESSING.MAX_RETRIES times.
 * Waits CONFIG.PROCESSING.RETRY_DELAY_MS milliseconds between attempts.
 *
 * @param {function(): *} operation     - Zero-argument function to execute
 * @param {string}        operationName - Label used in log and error messages
 * @returns {*} The return value of the first successful call
 * @throws {Error} If all retry attempts fail, with the last error message included
 */
function retryOperation(operation, operationName) {
  let lastError;

  for (let attempt = 1; attempt <= CONFIG.PROCESSING.MAX_RETRIES; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      console.warn(`${operationName} attempt ${attempt} failed: ${error.message}`);
      if (attempt < CONFIG.PROCESSING.MAX_RETRIES) {
        Utilities.sleep(CONFIG.PROCESSING.RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${CONFIG.PROCESSING.MAX_RETRIES} attempts. ` +
    `Last error: ${lastError.message}`
  );
}

/**
 * Sends a failure notification email to the script owner (the account running the trigger).
 * Logs a warning if the email itself cannot be sent, but does not throw.
 *
 * @param {Error} error - The error that caused the dropdown update to fail
 * @returns {void}
 */
function notifyOnError(error) {
  try {
    const subject = 'NAHS Form Dropdown Update Failed';
    const body = [
      'The automated dropdown update for the NAHS Student Transition Form has failed.',
      '',
      'Error Details:',
      `- Type:      ${error.name      || 'Unknown'}`,
      `- Message:   ${error.message}`,
      `- Operation: ${error.operation || 'Unknown'}`,
      `- Timestamp: ${new Date().toISOString()}`,
      '',
      'Check the Apps Script execution logs for more details.'
    ].join('\n');

    GmailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);

  } catch (emailError) {
    console.error('Failed to send error notification email:', emailError);
  }
}
