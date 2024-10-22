// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as https from 'https';


let myStatusBarItem: vscode.StatusBarItem;

// Data returned from the glucose sensor
interface DataResult {
    sgv: number;		// Sensor Glucose Value
    direction: string;	// Trend direction
    date: number;		// Date of the reading (epoch time)
}

// Latest data from the glucose sensor
let currentResult : DataResult = { sgv: 0, direction: "", date: 0 };

// Configuration for the extension
interface nightscoutConfig {
	glucoseUnits: string;
	nightscoutHost: string;
	token: string;
	lowGlucoseWarningEnabled: boolean;
	highGlucoseWarningEnabled: boolean;
	lowGlucoseThreshold: number;
	highGlucoseThreshold: number;
}

// Default configuration for the extension
let myConfig: nightscoutConfig = { glucoseUnits: 'milligrams', nightscoutHost: '', token: '', lowGlucoseWarningEnabled: true, highGlucoseWarningEnabled: true, lowGlucoseThreshold: 70, highGlucoseThreshold: 180 };

// Output channel for logging
let logOutputChannel : vscode.LogOutputChannel;

// Update interval for the status bar item
const updateInterval = 600000; // 10 minutes

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

	// Create a new output channel for logging
	logOutputChannel = vscode.window.createOutputChannel("Nightscout CGM Output", {log: true});

	// This line of code will only be executed once when the extension is activated
	logOutputChannel.info('Extension "nightscout-status-bar" is now active!');

	// Set the configuration for the extension
	updateConfig();

	// Listening to configuration changes
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('nightscout-status-bar')) {
			updateConfig();
			updateStatusBarItem();
		}
	}));

	// Register the command to show the date of the last entry
	const myCommandId = 'nightscout-status-bar.update-and-show-date';
	const disposable = vscode.commands.registerCommand(myCommandId, () => {
		updateStatusBarItemAndShowDate();
	});

	// create a new status bar item
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = myCommandId;
	context.subscriptions.push(myStatusBarItem);

	// Run updateStatusBarItem
	const interval = setInterval(updateStatusBarItem, updateInterval);
	// Push the interval to the subscriptions array to manage its lifecycle
	context.subscriptions.push({ dispose: () => clearInterval(interval) });

	// update status bar item once at start
	myStatusBarItem.text = `---`;
	myStatusBarItem.show();
	updateStatusBarItem();
	context.subscriptions.push(disposable);
}

// This method is called when the extension is deactivated
export function deactivate() {}

// Function to update the status bar item and show the date of the last entry
function updateStatusBarItemAndShowDate(): void {
	updateStatusBarItem().then(() => {
		if (currentResult.sgv > 0) {
			vscode.window.showInformationMessage(`Nightscout CGM last entry at: ${new Date(currentResult.date).toLocaleString()}`);
		} else {
			vscode.window.showInformationMessage(`No data available.`);
		}
	});
}

// Function to update the configuration for the extension
function updateConfig(): void {
	// Get the configuration object for the extension
    const config = vscode.workspace.getConfiguration('nightscout-status-bar');

    // Set configuration with settings with default values
    myConfig.glucoseUnits = config.get<string>('glucoseUnits', 'milligrams');
    myConfig.nightscoutHost = config.get<string>('nightscoutHost', '');
    myConfig.token = config.get<string>('token', '');
	myConfig.lowGlucoseWarningEnabled = config.get<boolean>('low-glucose-warning.enabled', true);
	myConfig.highGlucoseWarningEnabled = config.get<boolean>('high-glucose-warning.enabled', true);
	myConfig.lowGlucoseThreshold = config.get<number>('low-glucose-warning.value', 70);
	myConfig.highGlucoseThreshold = config.get<number>('high-glucose-warning.value', 180);
}

// Async function to get the latest data and update the status bar item
async function updateStatusBarItem(): Promise<void> {
	fetchData()
		.then((newResult) => {
			// Update the current result
			currentResult = newResult;
			// Update the status bar item
			if (currentResult.sgv > 0) {
				let sgv = currentResult.sgv;
				let units = "mg/dL";
				if (myConfig.glucoseUnits === 'millimolar') {
					sgv = currentResult.sgv / 18;
					units = "mmol/L";
				}
				// Get the trend icon based on the direction
				let icon = getTrendIcon(currentResult.direction);
				myStatusBarItem.text = `${sgv.toFixed(1)} ${units} ${icon}`;
				myStatusBarItem.show();
				showWarning();
			// If no data is available
			} else {
				myStatusBarItem.text = `---`;
				myStatusBarItem.show();
			}
		})
		// Catch any errors and log them
		.catch((error) => {
			logOutputChannel.error('Error fetching data:', error);
			currentResult = { sgv: 0, direction: "", date: 0 };
			vscode.window.showErrorMessage(`Error fetching data: ${error.message || error}`);
			myStatusBarItem.text = `---`;
			myStatusBarItem.show();
		});
}

// Async function to perform the GET request
async function fetchData(): Promise<DataResult> {
	// Load Hostname and API Token from configuration
	const URL_PARAM = myConfig.nightscoutHost;
	const API_KEY = myConfig.token;

	// Validate that URL and API_KEY are provided
	if (!URL_PARAM || !API_KEY) {
		logOutputChannel.error('Error: Hostname and API Token must be set in the extension configuration.');
		throw new Error('Hostname and API Token must be set in extension configuration.');
	}

	// Construct the full URL with query parameters
    const fullUrl = new URL(`https://${URL_PARAM}/api/v1/entries.json`);
    fullUrl.searchParams.append('count', '1');
    fullUrl.searchParams.append('secret', API_KEY);
	
    try {
        logOutputChannel.info(`Making request to ${URL_PARAM}`);
		// Make the GET request
        const data = await new Promise<any>((resolve, reject) => {
			const req = https.get(fullUrl, (res) => {
				const { statusCode } = res;
				const contentType = res.headers['content-type'];

				let error;
				if (statusCode !== 200) {
					error = new Error(`Request Failed. Status Code: ${statusCode}`);
				} else if (!contentType || !/^application\/json/.test(contentType)) {
					error = new Error(`Invalid content-type. Expected application/json but received ${contentType}`);
				}

				if (error) {
					logOutputChannel.error(error.message);
					res.resume();
					reject(error);
					return;
				}

				let rawData = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => { rawData += chunk; });
				res.on('end', () => {
					try {
						const parsedData = JSON.parse(rawData);
						resolve(parsedData);
					} catch (e) {
						logOutputChannel.error('Error parsing JSON:', (e as Error).message);
						reject(e);
					}
				});
			});

			req.on('error', (e) => {
				logOutputChannel.error('Request error:', e.message);
				reject(e);
			});

			req.end();
		});

		// Extract the result from the data
		if (Array.isArray(data) && data.length > 0) {
			const { sgv, direction, date } = {
				sgv: data[0].sgv,
				direction: data[0].direction,
				date: data[0].date
			};

			// Log the data
			logOutputChannel.info('SGV Value:', sgv);
    		logOutputChannel.info('Direction:', direction);
    		logOutputChannel.info('Date:', date);
			
			return { sgv, direction, date };
		} else {
			// Log an error in case of no data
			logOutputChannel.error('No data received or data is not an array.');
			return { sgv: 0, direction: "", date: 0 };
		}
	// Catch any errors and log them
    } catch (error) {
		if (error instanceof Error) {
			logOutputChannel.error('Error:', error.message);
		} else {
			logOutputChannel.error('Unexpected error:', error);
		}
		throw error;
	}
}

// Function to show a warning message if the glucose level is too low or too high
function showWarning(): void {
	if (currentResult.sgv > 0 && currentResult.sgv < myConfig.lowGlucoseThreshold && myConfig.lowGlucoseWarningEnabled) {
		vscode.window.showWarningMessage(`Low blood glucose!`);
	} else if (currentResult.sgv > 0 && currentResult.sgv > myConfig.highGlucoseThreshold && myConfig.highGlucoseWarningEnabled) {
		vscode.window.showWarningMessage(`High blood glucose!`);
	}
}

// Function to get the trend icon based on the direction
function getTrendIcon(direction: string): string {
	switch (direction) {
		case 'Flat':
			return '→';
		case 'SingleUp':
			return '↑';
		case 'DoubleUp':
			return '↑↑';
		case 'SingleDown':
			return '↓';
		case 'DoubleDown':
			return '↓↓';
		case 'FortyFiveUp':
			return '↗';
		case 'FortyFiveDown':
			return '↘';
		default:
			return '??';
	}
}