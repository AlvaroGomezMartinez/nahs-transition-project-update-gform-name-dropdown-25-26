# NAHS Student Transition Form Dropdown Manager

An automated Google Apps Script solution that populates student dropdown choices in the NAHS Student Transition Form based on data from a Google Sheets database.

## Overview

This script automatically synchronizes student information from the "NAHS 25-26 Student Transition Notes" spreadsheet to populate dropdown choices in the "25-26 AEP Transition Plan - Academic & Behavioral Progress Teacher Notes" Google Form.

## Features

- **Automated Data Sync**: Runs on a time-based trigger (every 5 minutes)
- **Error Handling**: Comprehensive error handling with email notifications
- **Data Validation**: Validates and sanitizes student data before processing
- **Retry Logic**: Automatically retries failed operations with exponential backoff
- **Logging**: Detailed logging for debugging and monitoring
- **Performance Optimized**: Efficient data processing with duplicate removal
- **Configurable**: Easy-to-modify configuration object for IDs and settings

## Configuration

All configuration is centralized in the `CONFIG` object at the top of `Code.js`:

```javascript
const CONFIG = {
  FORM: {
    ID: "1V9mjRuavk-5d-nmtfoOouLas5f-DuztLb8InpxLijyk",
    QUESTION_ID: "516226695"
  },
  SPREADSHEET: {
    ID: "14-nvlNOLWebnJJOQNZPnglWx0OuE5U-_xEbXGodND6E",
    SHEET_NAME: "TENTATIVE-Version2"
  }
};
```

## Functions

### Main Functions

- **`populateDropdown()`** - Main entry point that orchestrates the entire process
- **`getStudentData()`** - Retrieves raw student data from the spreadsheet
- **`processStudentData()`** - Processes and formats student data for the dropdown
- **`updateFormDropdown()`** - Updates the Google Form with new choices

### Utility Functions

- **`testConfiguration()`** - Tests all connections and configuration
- **`dryRun()`** - Runs the process without updating the form (for testing)
- **`retryOperation()`** - Provides retry logic for failed operations
- **`notifyOnError()`** - Sends email notifications on critical failures

### Data Processing Functions

- **`parseStudentRecord()`** - Parses individual student records
- **`formatStudentChoice()`** - Formats student data into dropdown choices
- **`sanitizeField()`** - Cleans and validates field data
- **`isValidStudentChoice()`** - Validates formatted choices

## Setup Instructions

### 1. Deploy the Script

1. Open [Google Apps Script](https://script.google.com)
2. Create a new project or open the existing one
3. Replace the contents of `Code.js` with the refactored code
4. Update `appsscript.json` with the new configuration
5. Save the project

### 2. Configure Access Permissions

The script requires the following permissions:
- Google Sheets (read access)
- Google Forms (edit access)
- Gmail (send access for error notifications)

### 3. Set Up Time-Based Trigger

1. In the Apps Script editor, click on the clock icon (Triggers)
2. Click "Add Trigger"
3. Configure:
   - Choose function: `populateDropdown`
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5 minutes

### 4. Test the Configuration

Run the `testConfiguration()` function to verify all connections work properly.

## Data Format

The script expects the following data structure in the spreadsheet:

| Column | Field | Description |
|--------|--------|-------------|
| B | Last Name | Student's last name (required) |
| C | First Name | Student's first name (required) |
| D | Student ID | Unique student identifier |
| E | Grade | Student's grade level |

## Output Format

Students are formatted in the dropdown as:
```
Last, First (StudentID) Grade: X
```

Example: `Smith, John (12345) Grade: 9`

## Error Handling

The script includes comprehensive error handling:

- **Connection Errors**: Retries failed API calls with exponential backoff
- **Data Validation**: Skips invalid records and logs warnings
- **Critical Failures**: Sends email notifications to the script owner
- **Graceful Degradation**: Continues processing even if some records fail

## Monitoring and Debugging

### View Logs
1. In Apps Script editor, click "Executions" to view recent runs
2. Click on any execution to see detailed logs
3. Check for errors or warnings in the output

### Test Functions

- **`testConfiguration()`** - Validates all connections and settings
- **`dryRun()`** - Processes data without updating the form
- **Manual Run** - Execute `populateDropdown()` manually for testing

## Troubleshooting

### Common Issues

1. **"Sheet not found" error**
   - Verify the sheet name in CONFIG.SPREADSHEET.SHEET_NAME
   - Check that the spreadsheet ID is correct

2. **"Form item not found" error**
   - Verify the form ID and question ID in CONFIG.FORM
   - Ensure the question is a dropdown/list type

3. **Permission errors**
   - Re-authorize the script permissions
   - Check that the account has access to both the form and spreadsheet

4. **No data appearing**
   - Run `dryRun()` to see processed data without updating the form
   - Check that student records have required fields (first and last name)

### Getting Help

For technical issues:
1. Check the execution logs in Apps Script
2. Run the test functions to isolate problems
3. Verify all IDs and permissions are correct

## Version History

- **v2.0.0** (2025-08-05) - Major refactoring with improved error handling, modularity, and documentation
- **v1.0.0** (2024-12-10) - Initial implementation

## Contact

**Alvaro Gomez**  
Academic Technology Coach  
Email: alvaro.gomez@nisd.net  
Office: +1-210-363-1577  
Mobile: +1-210-363-1577  

## License

This project is proprietary to Northside Independent School District (NISD).
