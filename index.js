const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config(); // Loads environment variables from a .env file

// ARG PARSING
const argv = yargs(hideBin(process.argv))
    .option('url', {
        alias: 'u',
        type: 'string',
        description: 'The full URL of the website to monitor'
    })
    .option('apiKey', {
        alias: 'k',
        type: 'string',
        description: 'Your Pushbullet API Key'
    })
    .option('interval', {
        alias: 'i',
        type: 'number',
        description: 'The check interval in milliseconds'
    })
    .argv;

// CONFIG
const API_KEY = argv.apiKey || process.env.PUSHBULLET_API_KEY;
const URL_TO_WATCH = argv.url || process.env.URL_TO_WATCH;
const CHECK_INTERVAL_MS = parseInt(argv.interval || process.env.CHECK_INTERVAL_MS, 10) || 300000; // Default to 5 minutes

// VALIDATION
if (!API_KEY) {
    console.error("FATAL ERROR: Pushbullet API Key is not defined. Provide it via the --apiKey flag or in the .env file as PUSHBULLET_API_KEY.");
    process.exit(1);
}
if (!URL_TO_WATCH) {
    console.error("FATAL ERROR: URL to watch is not defined. Provide it via the --url flag or in the .env file as URL_TO_WATCH.");
    process.exit(1);
}

// STATE
let isCurrentlyUp = true;

/**
 * Sends a notification via Pushbullet.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main content of the notification.
 */
async function sendNotification(title, body) {
    console.log('Attempting to send Pushbullet notification...');
    try {
        // Make a POST request directly to the Pushbullet API endpoint.
        await axios.post('https://api.pushbullet.com/v2/pushes', {
            type: 'note',
            title: title,
            body: body
        }, {
            headers: {
                'Access-Token': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log('Pushbullet notification sent successfully!');
    } catch (error) {
        // Axios provides more detailed error information, which is helpful for debugging.
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx (e.g., 401 Unauthorized, 400 Bad Request)
            console.error(`Pushbullet API Error: ${error.response.status} ${error.response.statusText}`);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Pushbullet notification failed: No response received from server.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Pushbullet notification failed:', error.message);
        }
    }
}

/**
 * Checks the status of the target website.
 * This function handles the logic for determining if the site is up or down
 * and whether a notification needs to be sent.
 */
async function checkWebsite() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Checking status of ${URL_TO_WATCH}...`);

    try {
        // We set a timeout to prevent the request from hanging indefinitely.
        // If a site takes more than 15 seconds to respond, it's effectively down.
        const response = await axios.get(URL_TO_WATCH, { timeout: 15000 });

        // A status code in the 2xx range indicates success.
        if (response.status >= 200 && response.status < 300) {
            console.log(`[SUCCESS] Website is up. Status: ${response.status}.`);
            if (!isCurrentlyUp) {
                // The site was previously down, but is now up.
                isCurrentlyUp = true;
                const title = '✅ Website Back Online';
                const body = `${URL_TO_WATCH} is back up and running as of ${new Date().toLocaleString()}.`;
                sendNotification(title, body);
            }
        } else {
            // The request completed, but with a non-success status code (e.g., 404, 500).
            // This is also considered a "down" state.
            throw new Error(`Received non-success status code: ${response.status}`);
        }   
    } catch (error) {
        // This block catches network errors (e.g., DNS resolution failed, connection refused)
        // or the error thrown above for bad status codes.
        console.error(`[FAILURE] Website is down. Reason: ${error.message}`);
        if (isCurrentlyUp) {
            // The site was previously up, but is now down.
            isCurrentlyUp = false;
            const title = '🚨 Website Down Alert';
            const body = `${URL_TO_WATCH} appears to be down as of ${new Date().toLocaleString()}. Error: ${error.message}`;
            sendNotification(title, body);
        }
    }
}

/**
 * The main function to start the monitoring process.
 * @param {string} url - The URL to monitor.
 * @param {number} interval - The interval in milliseconds between checks.
 */
function startMonitoring(url = URL_TO_WATCH, interval = CHECK_INTERVAL_MS) {
    console.log('--- Website Downtime Notifier ---');
    console.log(`Monitoring: ${url}`);
    console.log(`Check Interval: ${interval / 1000} seconds`);
    console.log('---------------------------------');

    // Perform an initial check immediately on startup.
    checkWebsite();

    // Set up a recurring check at the specified interval.
    setInterval(checkWebsite, interval);
}

// This block allows the script to be run directly from the command line (e.g., `node index.js`)
// while also being importable as a module into other files.
if (require.main === module) {
    startMonitoring();
}

// Export the main function for use as a library.
module.exports = {
    startMonitoring
};