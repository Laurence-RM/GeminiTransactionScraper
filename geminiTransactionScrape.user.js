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
// @version     2.0
// @author      Laurence Mullen <github.com/laurence-rm>
// @description Scrape transaction history for a Gemini Credit Card (all or after a certain date)
// ==/UserScript==

waitForKeyElements(".e1czpx481", script);

function script() {
    "use strict";

    let pikadayCSS = GM_addElement('link', {rel:"stylesheet", type:"text/css", href:"https://cdn.jsdelivr.net/npm/pikaday/css/pikaday.css"});

    // Define the CSV header and initialize the data array
    const csvHeader = "Date,Merchant,Category,Account,Original Statement,Notes,Amount\n";
    let data = [csvHeader];

    // Add a "Download CSV" button to the activity page
    const downloadButton = document.createElement("button");
    downloadButton.innerText = "Download CSV";
    downloadButton.className = "e1fsl8uw0 css-10lg8tm e1czpx482";
    downloadButton.style = "margin-left:70%"

    // add input box for pikaday date selection for starting date
    const dateInput = document.createElement('input');
    dateInput.type = "text";
    dateInput.id = "startDate";
    dateInput.placeholder = "Start Date";
    dateInput.style = "border-radius: 15px;border-style: solid;border-width: 1px;padding-left: 10px;width: 175px";
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
        const startDate = picker.getDate();

        // Scrape each row from the transaction table and add it to the data array
        var transactionList = document.getElementsByTagName("table")[0];
        const transactionRows = transactionList.querySelectorAll("tbody tr");

        transactionRows.forEach((row) => {
            const columns = row.querySelectorAll("td");
            const textLeft = columns[0].querySelectorAll("p");
            const textRight = columns[1].querySelectorAll("p, strong");

            // Date processing
            var dateText = textLeft[1].textContent.trim()

            var date = null;
            if (dateText.slice(-3) == "ago") {
                date = new Date();
                date.setDate(date.getDate() - Number(dateText[0]));
            } else if (dateText == "Today") {
                date = new Date();
            } else {
                // if in Month day, year format
                date = new Date(dateText);
            }

            // Check if date is after startDate
            if (startDate && date >= startDate) {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const day = date.getDate().toString().padStart(2, "0");
                const formattedDate = `${year}-${month}-${day}`;

                // Other details
                const merchant = textLeft[0].textContent.trim().replace(/\n/g, '');
                var processing = false;
                const amount = textRight[0].textContent.trim().replace(/,/g, '').replace("Processing", function(){processing = true; return "";});
                var dataRow = "";
                if (amount.slice(0, 1) != "-") {
                    if (textRight.length > 1) {
                      var reward_percent = textRight[1].textContent;
                      if (textRight.length == 3) {
                        reward_percent += " + " + textRight[2].textContent;
                      }
                    } else {
                      reward_percent = 0;
                    }
                    dataRow = `${formattedDate},${merchant},,Gemini Credit,,Reward: ${reward_percent},-${amount}\n`;
                } else {
                    dataRow = `${formattedDate},${merchant},,Gemini Credit,,Debt payment,${amount.slice(1)}\n`;
                }
                if (!processing) {
                    data.push(dataRow);
                    console.log(dataRow);
                }
            }
        });

        console.log("Finished row scrape with " + data.length + " rows.");
        // Download the CSV file
        const csvData = data.join("");
        const csvBlob = new Blob([csvData], {
            type: "text/csv;charset=utf-8;",
        });
        const csvUrl = URL.createObjectURL(csvBlob);
        var timestamp = new Date().toISOString().replace(/:/g, "-").slice(0,10);
        const fileName = "gemini_credit_transactions_" + ((startDate) ? picker.toString() +"_to_": "") + timestamp + ".csv";
        //GM_download(csvUrl, fileName);
        const downloadLink = document.createElement("a");
        downloadLink.href = csvUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        // Reset the data array
        data = [];
    });
    document.querySelector(".css-1cuvbbb").appendChild(downloadButton);
    document.querySelector(".css-1cuvbbb").appendChild(dateInput);

    return false;
}
