# GeminiTransactionScraper
A userscript to scrape transactions from Gemini's Credit Card Transaction History.

It improves on the existing export feature by allowing you to export your entire history in a single click, or only transactions after a specific date.

This script will scrape your entire transaction history and create a CSV formatted to work with Monarch Money.

### Caveats
 - Will not scrape category (requires opening each modal - may add option in future verison)
 - On Monarch, make sure to enable "Adjust account's balances based on these transactions" when importing the CSV.

## V3.0 Release 7/25/25
 - Fixed Button/Date Picker Styling
 - Fixed Interest Charge Error
 - Now properly ensures script only runs once on transaction page load
 - Logic and parsing improvements
 - Cleaner CSV download logic
 - Modified default Export text
