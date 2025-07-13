const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Loads environment variables from a .env file

// CONFIG
// Load config.json
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
    console.error('Could not read config.json:', err.message);
    return;
}

// Add values from environment variables if they exist
if (process.env.URL_TO_WATCH) {
    config.urlToWatch = process.env.URL_TO_WATCH;
}
if (process.env.CHECK_INTERVAL_MS) {
    const interval = parseInt(process.env.CHECK_INTERVAL_MS, 10);
    if (!isNaN(interval) && interval > 0) {
        config.checkIntervalMs = interval;
    } else {
        console.error('Invalid CHECK_INTERVAL_MS in environment variables. It should be a positive number.');
        return;
    }
}
if (process.env.NOTIFIERS) {
    try {
        const notifiers = JSON.parse(process.env.NOTIFIERS);
        if (typeof notifiers === 'object') {
            for (const key of Object.keys(notifiers)) {
                notifiers[key].enabled = true;
            }
            config.notifiers = notifiers;
        } else {
            console.error('Invalid NOTIFIERS in environment variables. It should be a JSON object.');
            return;
        }
    } catch (err) {
        console.error('Error parsing NOTIFIERS from environment variables:', err.message);
        return;
    }
}

// VALIDATION
// Validate URL_TO_WATCH
const URL_TO_WATCH = config.urlToWatch || 'https://example.com';
if (typeof URL_TO_WATCH !== 'string' || !URL_TO_WATCH.startsWith('http')) {
    console.error('Invalid URL_TO_WATCH in config.json. Please provide a valid URL.');
    return;
}
// Validate CHECK_INTERVAL_MS
const CHECK_INTERVAL_MS = config.checkIntervalMs || 60000; // Default to 60 seconds
if (typeof CHECK_INTERVAL_MS !== 'number' || CHECK_INTERVAL_MS <= 0) {
    console.error('Invalid CHECK_INTERVAL_MS in config.json. Please provide a positive number.');
    return;
}
// Validate notifiers
if (config.notifiers && typeof config.notifiers !== 'object') {
    console.error('Invalid notifiers configuration in config.json. It should be an object.');
    return;
}

console.log(config);

// STATE
let isCurrentlyUp = true;
// Determine which notifiers are enabled
const notifiers = [];
if (config.notifiers && typeof config.notifiers === 'object') {
    for (const [name, settings] of Object.entries(config.notifiers)) {
        if (settings.enabled === true) {
            notifiers.push(name);
        }
    }
}

/**
 * Sends a notification via Pushbullet.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main content of the notification.
 */
async function sendNotification(title, body) {
    console.log('Attempting to send notification via ' + notifiers.join(', '));

    // Send notification to each enabled notifier
    for (const notifier of notifiers) {
        try {
            const notifierModule = require(`./notifiers/${notifier}`);
            await notifierModule.send(config.notifiers[notifier], title, body, isCurrentlyUp);
        } catch (error) {
            console.error(`Error sending notification via ${notifier}:`, error.message);
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