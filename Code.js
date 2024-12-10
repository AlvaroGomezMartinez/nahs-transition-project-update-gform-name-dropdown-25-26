/**
 * The function below fills in the dropdown in question 1 of the Google Form called
 * '24-25 AEP Transition Plan - Academic & Behavioral Progress Teacher Notes'
 * with student data from the 'TENTATIVE' sheet in the 'NAHS 24-25 Student
 * Transition Notes' database.
 *
 * The function is set to run on a time trigger that fires every five minutes.
 *
 * Point of contact: Alvaro Gomez
 *                   Academic Technology Coach
 *                   alvaro.gomez@nisd.net
 *                   Office: +1-210-363-1577
 *                   Mobile: +1-210-363-1577
 *
 * Latest update: 12/10/24
*/

function populateDropdown() {
  var form = FormApp.openById("1V9mjRuavk-5d-nmtfoOouLas5f-DuztLb8InpxLijyk"); // Editable Google Form
  var sheet = SpreadsheetApp.openById("14-nvlNOLWebnJJOQNZPnglWx0OuE5U-_xEbXGodND6E"); // This is the 2024-2025 NAHS Student Transition Notes sheet

  // Define the range to process
  var sheetName = "TENTATIVE-Version2";
  var range = sheet.getSheetByName(sheetName);
  if (!range) {
    Logger.log(`Sheet "${sheetName}" not found.`);
    return;
  }

  // Get the entire range of relevant data
  var data = range.getRange(2, 2, range.getLastRow() - 1, 4).getValues(); // Columns B (Last Name) to E (Grade)
  var choices = new Set(); // Use a Set to ensure uniqueness

  // Process each row
  data.forEach((row, index) => {
    var lastName = row[0] ? row[0].toString().trim() : ""; // Column B
    var firstName = row[1] ? row[1].toString().trim() : ""; // Column C
    var studentId = row[2] ? row[2].toString().trim() : ""; // Column D
    var studentGrade = row[3] ? row[3].toString().trim() : ""; // Column E

    // Skip if all fields are empty
    if (!lastName && !firstName && !studentId && !studentGrade) {
      Logger.log(`Row ${index + 2}: Skipped (all fields empty).`);
      return;
    }

    // Combine fields into a single string
    var fullName = `${lastName}, ${firstName} (${studentId}) Grade: ${studentGrade}`;
    choices.add(fullName);
  });

  // Convert the Set to an array and sort it alphabetically
  var uniqueChoices = Array.from(choices).sort();

  // Update the Google Form
  var questionIdToUpdate = "516226695"; // Replace with your actual question ID
  var formItem = form.getItemById(questionIdToUpdate);

  if (formItem) {
    if (formItem.getType() === FormApp.ItemType.LIST) {
      var dropdownItem = formItem.asListItem();
      dropdownItem.setChoiceValues(uniqueChoices);
      Logger.log("Dropdown updated successfully.");
    } else {
      Logger.log("The specified item is not a List Item (dropdown).");
    }
  } else {
    Logger.log(`Item with ID ${questionIdToUpdate} not found.`);
  }
}

