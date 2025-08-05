/**
 * NAHS Student Transition Form Dropdown Manager
 * 
 * This script automatically populates the student dropdown in the Google Form
 * '25-26 AEP Transition Plan - Academic & Behavioral Progress Teacher Notes'
 * with student data from the NAHS Student Transition Notes spreadsheet.
 *
 * @author Alvaro Gomez <alvaro.gomez@nisd.net>
 * @version 2.0.0
 * @since 2024-12-10
 * @updated 2025-08-05
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration object containing all form and spreadsheet IDs
 * @const {Object}
 */
const CONFIG = {
  // Google Form configuration
  FORM: {
    ID: "1V9mjRuavk-5d-nmtfoOouLas5f-DuztLb8InpxLijyk",
    QUESTION_ID: "516226695"
  },
  
  // Spreadsheet configuration
  SPREADSHEET: {
    ID: "14-nvlNOLWebnJJOQNZPnglWx0OuE5U-_xEbXGodND6E",
    SHEET_NAME: "TENTATIVE-Version2",
    DATA_START_ROW: 2,
    COLUMNS: {
      LAST_NAME: 1,   // Column B (0-indexed from data range start)
      FIRST_NAME: 2,  // Column C
      STUDENT_ID: 3,  // Column D
      GRADE: 4        // Column E
    }
  },
  
  // Processing configuration
  PROCESSING: {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    BATCH_SIZE: 500
  }
};

/**
 * Custom error class for form operations
 */
class FormOperationError extends Error {
  constructor(message, operation, originalError = null) {
    super(message);
    this.name = 'FormOperationError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Custom error class for spreadsheet operations
 */
class SpreadsheetOperationError extends Error {
  constructor(message, operation, originalError = null) {
    super(message);
    this.name = 'SpreadsheetOperationError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Main function that populates the dropdown with student data
 * This function is designed to be called by time-based triggers
 * 
 * @returns {boolean} True if successful, false otherwise
 */
function populateDropdown() {
  const startTime = new Date();
  
  try {
    console.log('Starting dropdown population process...');
    
    // Get student data from spreadsheet
    const studentData = getStudentData();
    
    if (!studentData || studentData.length === 0) {
      console.warn('No student data found. Dropdown will be cleared.');
      return updateFormDropdown([]);
    }
    
    // Process and format student data
    const formattedChoices = processStudentData(studentData);
    
    // Update the form dropdown
    const success = updateFormDropdown(formattedChoices);
    
    const duration = (new Date() - startTime) / 1000;
    console.log(`Dropdown population completed in ${duration} seconds. ` +
                `Processed ${studentData.length} records, ` +
                `created ${formattedChoices.length} unique choices.`);
    
    return success;
    
  } catch (error) {
    console.error('Failed to populate dropdown:', error);
    
    // Send notification email for critical failures
    notifyOnError(error);
    
    return false;
  }
}

// =============================================================================
// DATA RETRIEVAL FUNCTIONS
// =============================================================================

/**
 * Retrieves student data from the configured spreadsheet
 * 
 * @returns {Array<Array>} Raw student data from spreadsheet
 * @throws {SpreadsheetOperationError} If unable to access spreadsheet or sheet
 */
function getStudentData() {
  try {
    console.log(`Opening spreadsheet: ${CONFIG.SPREADSHEET.ID}`);
    
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SPREADSHEET.SHEET_NAME);
    
    if (!sheet) {
      throw new SpreadsheetOperationError(
        `Sheet "${CONFIG.SPREADSHEET.SHEET_NAME}" not found`,
        'getSheet'
      );
    }
    
    // Validate sheet has data
    const lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.SPREADSHEET.DATA_START_ROW) {
      console.warn('Sheet appears to be empty or has no data rows');
      return [];
    }
    
    // Calculate data range
    const numRows = lastRow - CONFIG.SPREADSHEET.DATA_START_ROW + 1;
    const numCols = Math.max(...Object.values(CONFIG.SPREADSHEET.COLUMNS));
    
    console.log(`Reading ${numRows} rows and ${numCols} columns starting from row ${CONFIG.SPREADSHEET.DATA_START_ROW}`);
    
    // Get data range (columns B through E)
    const dataRange = sheet.getRange(
      CONFIG.SPREADSHEET.DATA_START_ROW, 
      2, // Start from column B
      numRows, 
      numCols
    );
    
    const data = dataRange.getValues();
    console.log(`Retrieved ${data.length} rows of data`);
    
    return data;
    
  } catch (error) {
    if (error instanceof SpreadsheetOperationError) {
      throw error;
    }
    
    throw new SpreadsheetOperationError(
      'Failed to retrieve student data from spreadsheet',
      'getData',
      error
    );
  }
}

// =============================================================================
// DATA PROCESSING FUNCTIONS
// =============================================================================

/**
 * Processes raw student data and formats it for the dropdown
 * 
 * @param {Array<Array>} rawData - Raw data from spreadsheet
 * @returns {Array<string>} Formatted and sorted student choices
 */
function processStudentData(rawData) {
  console.log(`Processing ${rawData.length} raw data rows...`);
  
  const choices = new Set();
  let validRecords = 0;
  let skippedRecords = 0;
  
  rawData.forEach((row, index) => {
    try {
      const student = parseStudentRecord(row, index);
      
      if (!student) {
        skippedRecords++;
        return;
      }
      
      const formattedName = formatStudentChoice(student);
      
      if (formattedName && isValidStudentChoice(formattedName)) {
        choices.add(formattedName);
        validRecords++;
      } else {
        console.warn(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Invalid formatted name: "${formattedName}"`);
        skippedRecords++;
      }
      
    } catch (error) {
      console.error(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Error processing record:`, error);
      skippedRecords++;
    }
  });
  
  // Convert to sorted array
  const sortedChoices = Array.from(choices).sort((a, b) => 
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );
  
  console.log(`Processing complete: ${validRecords} valid, ${skippedRecords} skipped, ${sortedChoices.length} unique choices`);
  
  return sortedChoices;
}

/**
 * Parses a single student record from spreadsheet row
 * 
 * @param {Array} row - Single row of data from spreadsheet
 * @param {number} index - Row index for logging
 * @returns {Object|null} Parsed student object or null if invalid
 */
function parseStudentRecord(row, index) {
  const student = {
    lastName: sanitizeField(row[CONFIG.SPREADSHEET.COLUMNS.LAST_NAME - 1]),
    firstName: sanitizeField(row[CONFIG.SPREADSHEET.COLUMNS.FIRST_NAME - 1]),
    studentId: sanitizeField(row[CONFIG.SPREADSHEET.COLUMNS.STUDENT_ID - 1]),
    grade: sanitizeField(row[CONFIG.SPREADSHEET.COLUMNS.GRADE - 1])
  };
  
  // Check if record has any meaningful data
  if (!student.lastName && !student.firstName && !student.studentId && !student.grade) {
    console.log(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Skipped (all fields empty)`);
    return null;
  }
  
  // Validate required fields
  if (!student.lastName || !student.firstName) {
    console.warn(`Row ${index + CONFIG.SPREADSHEET.DATA_START_ROW}: Missing required name fields`);
    return null;
  }
  
  return student;
}

/**
 * Sanitizes and normalizes field data
 * 
 * @param {*} value - Raw field value
 * @returns {string} Sanitized string value
 */
function sanitizeField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  return value.toString().trim().replace(/\s+/g, ' ');
}

/**
 * Formats student data into dropdown choice string
 * 
 * @param {Object} student - Student object with name, ID, and grade
 * @returns {string} Formatted choice string
 */
function formatStudentChoice(student) {
  const parts = [
    `${student.lastName}, ${student.firstName}`
  ];
  
  if (student.studentId) {
    parts.push(`(${student.studentId})`);
  }
  
  if (student.grade) {
    parts.push(`Grade: ${student.grade}`);
  }
  
  return parts.join(' ');
}

/**
 * Validates a formatted student choice string
 * 
 * @param {string} choice - Formatted choice string
 * @returns {boolean} True if valid
 */
function isValidStudentChoice(choice) {
  return choice && 
         choice.length > 0 && 
         choice.length <= 200 && // Reasonable length limit
         choice.includes(','); // Must have comma for "Last, First" format
}

// =============================================================================
// FORM UPDATE FUNCTIONS
// =============================================================================

/**
 * Updates the Google Form dropdown with new choices
 * 
 * @param {Array<string>} choices - Array of formatted student choices
 * @returns {boolean} True if successful
 * @throws {FormOperationError} If unable to update form
 */
function updateFormDropdown(choices) {
  try {
    console.log(`Opening form: ${CONFIG.FORM.ID}`);
    
    const form = FormApp.openById(CONFIG.FORM.ID);
    const formItem = form.getItemById(CONFIG.FORM.QUESTION_ID);
    
    if (!formItem) {
      throw new FormOperationError(
        `Form item with ID ${CONFIG.FORM.QUESTION_ID} not found`,
        'getFormItem'
      );
    }
    
    if (formItem.getType() !== FormApp.ItemType.LIST) {
      throw new FormOperationError(
        `Form item is not a dropdown/list type. Found: ${formItem.getType()}`,
        'validateItemType'
      );
    }
    
    const dropdownItem = formItem.asListItem();
    
    // Update choices with retry logic
    return retryOperation(() => {
      dropdownItem.setChoiceValues(choices);
      console.log(`Successfully updated dropdown with ${choices.length} choices`);
      return true;
    }, 'updateDropdown');
    
  } catch (error) {
    if (error instanceof FormOperationError) {
      throw error;
    }
    
    throw new FormOperationError(
      'Failed to update form dropdown',
      'updateForm',
      error
    );
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Retry wrapper for operations that might fail temporarily
 * 
 * @param {Function} operation - Function to retry
 * @param {string} operationName - Name for logging
 * @returns {*} Result of successful operation
 */
function retryOperation(operation, operationName) {
  let lastError;
  
  for (let attempt = 1; attempt <= CONFIG.PROCESSING.MAX_RETRIES; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      console.warn(`${operationName} attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.PROCESSING.MAX_RETRIES) {
        console.log(`Retrying in ${CONFIG.PROCESSING.RETRY_DELAY_MS}ms...`);
        Utilities.sleep(CONFIG.PROCESSING.RETRY_DELAY_MS);
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${CONFIG.PROCESSING.MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}

/**
 * Sends error notification email for critical failures
 * 
 * @param {Error} error - The error that occurred
 */
function notifyOnError(error) {
  try {
    const subject = 'NAHS Form Dropdown Update Failed';
    const body = `
The automated dropdown update for the NAHS Student Transition Form has failed.

Error Details:
- Type: ${error.name || 'Unknown'}
- Message: ${error.message}
- Operation: ${error.operation || 'Unknown'}
- Timestamp: ${new Date().toISOString()}

Please check the Google Apps Script logs for more details and take appropriate action.

This is an automated message from the NAHS Form Dropdown Manager script.
    `.trim();
    
    // Send to the script owner (current user)
    GmailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);
    
  } catch (emailError) {
    console.error('Failed to send error notification email:', emailError);
  }
}

// =============================================================================
// TESTING AND DEBUGGING FUNCTIONS
// =============================================================================

/**
 * Test function to validate configuration and connections
 * Run this function manually to test the setup
 */
function testConfiguration() {
  console.log('Testing configuration...');
  
  try {
    // Test spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SPREADSHEET.SHEET_NAME);
    console.log(`✓ Spreadsheet access successful. Sheet has ${sheet.getLastRow()} rows.`);
    
    // Test form access
    const form = FormApp.openById(CONFIG.FORM.ID);
    const formItem = form.getItemById(CONFIG.FORM.QUESTION_ID);
    console.log(`✓ Form access successful. Question type: ${formItem.getType()}`);
    
    // Test data processing with small sample
    const sampleData = sheet.getRange(2, 2, Math.min(5, sheet.getLastRow() - 1), 4).getValues();
    const processed = processStudentData(sampleData);
    console.log(`✓ Data processing successful. Sample output: ${processed.slice(0, 3).join(', ')}`);
    
    console.log('✓ All tests passed!');
    
  } catch (error) {
    console.error('✗ Configuration test failed:', error);
  }
}

/**
 * Dry run function to test processing without updating the form
 */
function dryRun() {
  console.log('Starting dry run (no form updates)...');
  
  try {
    const studentData = getStudentData();
    const formattedChoices = processStudentData(studentData);
    
    console.log('Dry run results:');
    console.log(`- Total records processed: ${studentData.length}`);
    console.log(`- Unique choices generated: ${formattedChoices.length}`);
    console.log('- Sample choices:');
    formattedChoices.slice(0, 10).forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });
    
    if (formattedChoices.length > 10) {
      console.log(`  ... and ${formattedChoices.length - 10} more`);
    }
    
  } catch (error) {
    console.error('Dry run failed:', error);
  }
}

