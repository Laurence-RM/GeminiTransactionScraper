// ==UserScript==
// @name        Gemini Credit Card Transaction Scraper
// @namespace   Violentmonkey Scripts
// @match       https://creditcard.exchange.gemini.com/credit-card/dashboard
// @require  	http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require     https://cdn.jsdelivr.net/npm/pikaday/pikaday.js
// @grant       GM_download
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_addStyle
// @grant       GM_addElement
// @version     3.1
// @author      Laurence Mullen <github.com/laurence-rm>
// @description Scrape transaction history for a Gemini Credit Card (all or after a certain date)
// ==/UserScript==

waitForKeyElements(".epjqebc0", script, true);

function script() {
    "use strict";

    // Use unique IDs to make the script idempotent
    const DOWNLOAD_BUTTON_ID = "gemini-csv-download-button";
    const DATE_INPUT_ID = "gemini-csv-date-input";
    const PIKADAY_CSS_ID = "pikaday-css-stylesheet";

    // --- Guard Clause: Exit if the script has already run ---
    if (document.getElementById(DOWNLOAD_BUTTON_ID)) {
        return;
    }

    GM_addElement('link', { id: PIKADAY_CSS_ID, rel:"stylesheet", type:"text/css", href:"https://cdn.jsdelivr.net/npm/pikaday/css/pikaday.css"});

    // Add a "Download CSV" button to the activity page
    const downloadButton = document.createElement("button");
    downloadButton.id = DOWNLOAD_BUTTON_ID;
    downloadButton.innerText = "Download CSV";
    downloadButton.className = "e1fsl8uw0 css-10lg8tm e1czpx482";
    // This pushes the button and the date input to the right side of the flex container
    downloadButton.style.marginLeft = "auto";

    // add input box for pikaday date selection for starting date
    const dateInput = document.createElement('input');
    dateInput.type = "text";
    dateInput.id = DATE_INPUT_ID;
    dateInput.placeholder = "Start Date";
    // Added margin-left for spacing between the button and the input
    dateInput.style = "border-radius: 15px;border-style: solid;border-width: 1px;padding-left: 10px;width: 175px; margin-left: 12px;";
    var picker = new Pikaday({
        field: dateInput,
        maxDate: new Date(),
        toString(date, format="YYYY-MM-DD") {
            // you should do formatting based on the passed format,
            // but we will just return 'D/M/YYYY' for simplicity
            if (format === "YYYY-MM-DD") {
                return date.toISOString().slice(0, 10);
            } else {
                return date.toISOString();
            }
        }
    });

    downloadButton.addEventListener("click", () => {
        // Define the CSV header and initialize the data array inside the handler
        // This ensures the data is fresh for every download.
        const csvHeader = "Date,Merchant,Category,Account,Original Statement,Notes,Amount\n";
        const data = [csvHeader];
        const startDate = picker.getDate();

        // Scrape each row from the transaction table and add it to the data array
        const transactionList = document.getElementsByTagName("table")[0];
        const transactionRows = transactionList.querySelectorAll("tbody tr");

        transactionRows.forEach((row) => {
            const columns = row.querySelectorAll("td");
            const textLeft = columns[0].querySelectorAll("p");
            const textRight = columns[1].querySelectorAll("p, strong");

            let processing = false;

            // Date processing
            const dateText = textLeft[1].textContent.trim();
            const dateRe = /^[A-Z][a-z]+ \d+, \d+$/g
            let date = null;
            if (dateText.endsWith("ago")) {
                date = new Date();
                const daysAgo = parseInt(dateText, 10);
                if (!isNaN(daysAgo)) date.setDate(date.getDate() - daysAgo);
            } else if (dateText == "Today") {
                date = new Date();
            } else if (RegExp(dateRe).test(dateText)){
                // if in Month day, year format
                date = new Date(dateText);
            } else {
                // Pending transaction
                date = new Date();
                processing = true;
            }
            // Check if date is after startDate
            if (startDate && date >= startDate) {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const day = date.getDate().toString().padStart(2, "0");
                const formattedDate = `${year}-${month}-${day}`;

                // Other details
                const merchant = textLeft[0].textContent.trim().replace(/\n/g, '');
                const amount = textRight[0].textContent.trim().replace(/,/g, '').replace("Processing", function(){processing = true; return "";});
                // Types of transactions: Purchase (+Reward), Refund (-Reward), Interest Charge, Debt Payment
                let dataRow = `${formattedDate},"${merchant}",,Gemini Credit,,`;
                if (amount.slice(0, 1) != "-") {
                    if (textRight.length >= 2) {
                        // Purchase w/ reward
                        let reward_percent = textRight[1].textContent + ' Reward';
                        if (textRight.length == 3) {
                            // additional merchant reward
                            reward_percent += " + " + textRight[2].textContent + ' Merchant Reward';
                        }
                        dataRow += `${reward_percent},-${amount}\n`;
                    } else {
                        // Interest charge
                        dataRow += `Interest Charge,-${amount}\n`;
                    }
                } else {
                    if (merchant.toLowerCase() == "card payment") {
                        // Debt Payment
                        dataRow += `Debt payment,${amount.slice(1)}\n`;
                    } else {
                        // Refund
                        dataRow += `Refund,${amount.slice(1)}\n`;
                    }
                }
                if (!processing) {
                    data.push(dataRow);
                    console.log(dataRow);
                } else {
                    console.log("Pending: " + dataRow + "")
                }
            }
        });

        console.log("Finished row scrape with " + data.length + " rows.");
        // Download the CSV file
        const csvData = data.join("");
        const csvBlob = new Blob([csvData], {
            type: "text/csv;charset=utf-8;",
        });
        const timestamp = new Date().toISOString().replace(/:/g, "-").slice(0,10);
        const fileName = "gemini_credit_transactions_" + ((startDate) ? picker.toString() +"_to_": "") + timestamp + ".csv";

        // Use GM_download for a cleaner download experience in supported script managers
        GM_download(URL.createObjectURL(csvBlob), fileName);
    });

    document.querySelector(".css-1cuvbbb").getElementsByTagName("button")[1].style = "margin-left: 12px;"
    document.querySelector(".css-1cuvbbb").getElementsByTagName("button")[1].innerText = "Annual Export"
    document.querySelector(".css-1cuvbbb").appendChild(downloadButton);
    document.querySelector(".css-1cuvbbb").appendChild(dateInput);
}
