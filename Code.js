/************************************************************************************
 * The function below fills in the dropdown in question 1 of the Google Form called *
 * '24-25 AEP Transition Plan - Academic & Behavioral Progress Teacher Notes'       *
 * with student data from the 'TENTATIVE' sheet in the 'NAHS 24-25 Student          *
 * Transition Notes' database.                                                      *
 *                                                                                  *
 * The function is set to run on a time trigger that fires every morning between    *
 * 5:00 & 6:00 AM.                                                                  *
 *                                                                                  *
 * Point of contact: Alvaro Gomez                                                   *
 *                   Academic Technology Coach                                      *
 *                   alvaro.gomez@nisd.net                                          *
 *                   Office: +1-210-363-1577                                        *
 *                   Mobile: +1-210-363-1577                                        *
 *                                                                                  *
 * Latest update: 09/03/24                                                          *
 ************************************************************************************/

function populateDropdown() {
  var form = FormApp.openById("1V9mjRuavk-5d-nmtfoOouLas5f-DuztLb8InpxLijyk"); // This is the editable Google Form
  var sheet = SpreadsheetApp.openById(
    "14-nvlNOLWebnJJOQNZPnglWx0OuE5U-_xEbXGodND6E"
  ); // This is the 2024-2025 NAHS Student Transition Notes sheet

  // Determines the last row with data in each column to avoid blanks in the dropdown list
  var lastRowLastNames = sheet
    .getRange("TENTATIVE!B:B")
    .getValues()
    .filter(String).length;
  var lastRowFirstNames = sheet
    .getRange("TENTATIVE!C:C")
    .getValues()
    .filter(String).length;
  var lastRowIds = sheet
    .getRange("TENTATIVE!D:D")
    .getValues()
    .filter(String).length;
  var lastRowGrades = sheet
    .getRange("TENTATIVE!E:E")
    .getValues()
    .filter(String).length;

  // Gets the maximum last row value to ensure all of the data (without blank rows) are included
  var lastRow = Math.max(
    lastRowLastNames,
    lastRowFirstNames,
    lastRowIds,
    lastRowGrades
  );

  // Retrieves the values only up to the last row and handles empty cells by including them
  var lastNames = sheet
    .getRange("TENTATIVE!B2:B" + lastRow)
    .getValues()
    .map((row) => row[0] || "");
  var firstNames = sheet
    .getRange("TENTATIVE!C2:C" + lastRow)
    .getValues()
    .map((row) => row[0] || "");
  var ids = sheet
    .getRange("TENTATIVE!D2:D" + lastRow)
    .getValues()
    .map((row) => row[0] || "");
  var grades = sheet
    .getRange("TENTATIVE!E2:E" + lastRow)
    .getValues()
    .map((row) => row[0] || "");

  var questionIdToUpdate = "516226695";
  var formItem = form.getItemById(questionIdToUpdate);

  if (formItem) {
    var itemType = formItem.getType();

    if (itemType === FormApp.ItemType.LIST) {
      var dropdownItem = formItem.asListItem();
      var choices = new Set();

      for (var i = 0; i < lastRow; i++) {
        // Ensures each value is defined before calling .toString()
        var lastName = lastNames[i] ? lastNames[i].toString().trim() : "";
        var firstName = firstNames[i] ? firstNames[i].toString().trim() : "";
        var studentId = ids[i] ? ids[i].toString().trim() : "";
        var studentGrade = grades[i] ? grades[i].toString().trim() : "";

        // Skips the entry if all fields are empty so it excludes blank rows
        if (!lastName && !firstName && !studentId && !studentGrade) {
          continue; // Skips to the next iteration
        }

        var fullName = `${lastName}, ${firstName} (${studentId}) Grade: ${studentGrade}`;
        choices.add(fullName);
      }

      var uniqueChoices = Array.from(choices); // Converts the Set(choices) to an array
      uniqueChoices.sort();

      dropdownItem.setChoiceValues(uniqueChoices);
    } else {
      Logger.log("The specified item is not a List Item (dropdown).");
    }
  } else {
    Logger.log("Item with ID " + questionIdToUpdate + " not found.");
  }
}
