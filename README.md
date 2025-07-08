# awen: Website Downtime Notifier

A simple, backend-only Node.js package to monitor a specific website for downtime. If the site becomes unreachable, it sends a notification using the Pushbullet service.
## Features

- Continuous Monitoring: Periodically checks a target URL to ensure it's online.

- Stateful Notifications: Sends a notification only when the site's status changes (i.e., when it first goes down and when it first comes back up) to avoid spam.

- Pushbullet Integration: Leverages Pushbullet for reliable push notifications to your devices.

- Flexible Configuration: Configure via command-line arguments or environment variables.

- Lightweight: No front-end, designed to run as a background service.

## Setup
### 1. Prerequisites

- Node.js (v14 or later)

- A Pushbullet account

### 2. Installation

Clone or download the package files, then navigate into the directory and install the dependencies:
```
npm install
```
### 3. Get Your Pushbullet API Key

1. Go to your Pushbullet Account Settings page: https://www.pushbullet.com/#settings/account

2. Scroll down to "Access Tokens" and click "Create Access Token".

3. Copy this token. This is your API key.

### 4. Configuration

You can configure the notifier in two ways. Command-line arguments will always override environment variables.
#### Method 1: Command-Line Arguments (Recommended for flexibility)

You can pass configuration directly when you run the script.

    --url: The website to watch.

    --apiKey: Your Pushbullet API key.

    --interval: (Optional) The check interval in milliseconds.

##### Example:
```
node index.js --url="https://example.com" --apiKey="o.YOUR_API_KEY_HERE" --interval=60000
```
#### Method 2: Environment Variables (.env file)

Create a file named .env in the root of the project directory.

Now, open the .env file and fill in the required values. These will be used if no corresponding command-line arguments are provided.
```
# Your Pushbullet API key from your account settings
PUSHBULLET_API_KEY="YOUR_API_KEY_HERE"

# The full URL of the website you want to monitor
URL_TO_WATCH="https://example.com"

# (Optional) The time between checks in milliseconds. Defaults to 5 minutes (300000).
CHECK_INTERVAL_MS="300000"
```
## Usage
### As a Standalone Service

Once configured, you can start the monitoring script directly from your terminal.

#### Using .env file:
```
npm start
```
#### Using command-line arguments:
```
node index.js --url="https://example.com" --apiKey="o.YOUR_KEY"
```
For long-term use, you should run this script with a process manager like pm2 to ensure it runs continuously in the background.

#### Example with pm2:
```
# Install pm2 globally
npm install pm2 -g

# Start the notifier with pm2, passing arguments
pm2 start index.js --name "website-monitor" -- --url="https://yoursite.com" --apiKey="o.YOUR_KEY"
```
### As a Library

You can also integrate the monitoring logic into your own Node.js application.
```
const { startMonitoring } = require('./index');

// Note: The Pushbullet API key must be set as an environment variable
// or passed directly to the startMonitoring function if you modify it.
startMonitoring('https://my-other-website.com', 60000);
```