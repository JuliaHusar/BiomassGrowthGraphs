import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {google} from "googleapis";
const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
import * as fs from "node:fs";
const credentialJson = JSON.parse(fs.readFileSync('public/lux-sensor-454519-9b2211560e0b.json'));
const spreadsheetId = "1WyI3BF7X8E1tfdG5gItCJIME1lOwpcNre-TLFWTXIuc";

const auth = new google.auth.GoogleAuth({
    credentials: credentialJson,
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

app.get('/', (req, res) => {
    res.send('Hello World!');
    console.log(credentialJson);
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

function returnSelectedSheet(sheetValue){
    let selectedDataRange;

    switch (sheetValue) {
        case "lux_in":
            selectedDataRange = "Sheet1!A:C"
            break;
        case "lux_out":
            selectedDataRange = "Sheet2!A:C"
            break;
        case "co2_in":
            selectedDataRange = "co2_in!A:D"
            break;
        case "co2_out":
            selectedDataRange = "co2_out!A:D"
            break;
        default:
            selectedDataRange = "Sheet1!A:C"
    }
    return selectedDataRange;
}


function calibrateTime(data) {
    const adjustedData = {};

    for (const [sheetName, rows] of Object.entries(data)) {
        adjustedData[sheetName] = rows.map((row, index) => {
            if (index === 0) return row;

            const timeIndex = 0;
            const date = new Date(row[timeIndex]);
            date.setHours(date.getHours() - 5); // Adjust time
            row[timeIndex] = date.toISOString();
            return row;
        }).sort((a, b) => {
            if (a[0] === "time" || b[0] === "time") return 0;
            return new Date(a[0]) - new Date(b[0]);
        });
    }

    return adjustedData;
}

function cleanData(dataLists) {
    let adjustedData = calibrateTime(dataLists);

    // Filter out rows with null or undefined values
    for (const [sheetName, rows] of Object.entries(adjustedData)) {
        adjustedData[sheetName] = rows.filter((row, index) => {
            if (index === 0) return true; // Keep the header row
            return row.every(value => value !== null && value !== undefined);
        });
    }

    const combinedData = new Map();
    const headers = new Map();

    for (const [sheetName, rows] of Object.entries(adjustedData)) {
        rows.forEach((row, index) => {
            if (index === 0) {
                headers.set(sheetName, row);
                return;
            }

            const time = row[0];
            const values = row.slice(1);

            if (!combinedData.has(time)) {
                combinedData.set(time, { time, data: [] });
            }
            combinedData.get(time).data.push({ sheetName, values });
        });
    }

    const combinedRows = Array.from(combinedData.values()).map(({ time, data }) => {
        const combinedRow = [time];
        data.forEach(({ sheetName, values }) => {
            combinedRow.push(...values);
        });
        return combinedRow;
    });

    const combinedHeaders = ['time'];
    headers.forEach((header) => {
        combinedHeaders.push(...header.slice(1)); // Skip the 'time' column
    });

    return [combinedHeaders, ...combinedRows];
}

//Not worrying about requests every minute
/*
This will be called for a total of three graphs (as of now). One that displays data at an minute level over hours and days, one that is purely daily,
 and one that will be for an entire year. See Tableau Prep for more information on how data should be cleaned.
 */
app.post('/api/getData', async (req, res) => {
    const requestedDataTypes = req.body.sheetName;
    console.log(requestedDataTypes);
    let selectedDataRanges = [];
    const retrievedData = {};

    for (const requestedDataType of requestedDataTypes) {
        const selectedDataRange = returnSelectedSheet(requestedDataType);
        selectedDataRanges.push(selectedDataRange);
    }

    for (const selectedDataRange of selectedDataRanges) {
        try {
            const authObj = await auth.getClient();
            const sheetsInstance = google.sheets({version: "v4", auth:authObj});
            await sheetsInstance.spreadsheets.values.get({
                auth,
                spreadsheetId,
                range: selectedDataRange
            }).then(data => {
                retrievedData[selectedDataRange] = data.data.values;
            })
        } catch (error) {
            console.error("ERROR", error)
            res.status(500).send("Error when accessing google sheet")
        }
    }
    res.status(200).send(cleanData(retrievedData));
});