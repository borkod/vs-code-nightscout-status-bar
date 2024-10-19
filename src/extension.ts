// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';


let myStatusBarItem: vscode.StatusBarItem;

interface DataResult {
    sgv: number;
    direction: string;
    date: number;
}

let currentResult : DataResult = { sgv: 0, direction: "", date: 0 };

interface nightscoutConfig {
	glucoseUnits: string;
	nightscoutURL: string;
	token: string;
}

let myConfig: nightscoutConfig = { glucoseUnits: 'millimolar', nightscoutURL: '', token: '' };

let errorShown = false;



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "nightscout-status-bar" is now active!');

	// Set the configuration for the extension
	updateConfig();

	// Listening to configuration changes
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		console.log("CONFIG EVENT:",e);
		if (e.affectsConfiguration('nightscout-status-bar')) {
			updateConfig();
			updateStatusBarItem();
		}
	}));

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const myCommandId = 'nightscout-status-bar.helloWorld';
	const disposable = vscode.commands.registerCommand(myCommandId, () => {
		updateStatusBarItemAndShowDate();
	});

	// create a new status bar item
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = myCommandId;
	context.subscriptions.push(myStatusBarItem);

	// Run updateStatusBarItem every 10 minutes
	const interval = setInterval(updateStatusBarItem, 600000);
	// Push the interval to the subscriptions array to manage its lifecycle
	context.subscriptions.push({ dispose: () => clearInterval(interval) });

	// update status bar item once at start
	updateStatusBarItem();
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function updateStatusBarItemAndShowDate(): void {
	updateStatusBarItem().then(() => {
		vscode.window.showInformationMessage(`Nightscout last updated at: ${new Date(currentResult.date).toLocaleString()}`);
	});
}

function updateConfig(): void {
	// Get the configuration object for the extension
    const config = vscode.workspace.getConfiguration('nightscout-status-bar');

    // Set configuration with settings with default values
    myConfig.glucoseUnits = config.get<string>('glucoseUnits', 'millimolar');
    myConfig.nightscoutURL = config.get<string>('nightscoutURL', '');
    myConfig.token = config.get<string>('token', '');
}

async function updateStatusBarItem(): Promise<void> {
	fetchData()
		.then((newResult) => {
			currentResult = newResult;
			errorShown = false;
			if (currentResult.sgv > 0) {
				let sgv = currentResult.sgv / 18;
				let units = "mmol/L";
				if (myConfig.glucoseUnits === 'milligrams') {
					sgv = currentResult.sgv;
					units = "mg/dL";
				}
				let icon = getTrendIcon(currentResult.direction);
				myStatusBarItem.text = `${sgv.toFixed(2)} ${units} ${icon}`;
				myStatusBarItem.show();
			} else {
				//myStatusBarItem.hide();
			}
		})
		.catch((error) => {
			console.error('Error fetching data:', error);
			if (!errorShown) {
				vscode.window.showErrorMessage(`Error fetching data: ${error.message || error}`);
				errorShown = true;
			}
			//myStatusBarItem.hide();
		});
}

// Async function to perform the GET request
async function fetchData(): Promise<DataResult> {
	// Load URL and API_KEY from configuration
	const URL_PARAM = myConfig.nightscoutURL;
	const API_KEY = myConfig.token;

	// Validate that URL and API_KEY are provided
	if (!URL_PARAM || !API_KEY) {
		console.error('Error: URL and API_KEY must be set in environment variables.');
		throw new Error('URL and API_KEY must be set in environment variables.');
	}

	// Construct the full URL with query parameters
    const fullUrl = new URL(`https://${URL_PARAM}/api/v1/entries.json`);
    fullUrl.searchParams.append('count', '1');
    fullUrl.searchParams.append('secret', API_KEY);
	
    try {
        console.log(`Making request to ${fullUrl}`);
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
					console.error(error.message);
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
						console.error('Error parsing JSON:', (e as Error).message);
						reject(e);
					}
				});
			});

			req.on('error', (e) => {
				console.error('Request error:', e.message);
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

			console.log('SGV Value:', sgv);
    		console.log('Direction:', direction);
    		console.log('Date:', date);
			
			return { sgv, direction, date };
		} else {
			console.error('No data received or data is not an array.');
			return { sgv: 0, direction: "", date: 0 };
		}

    } catch (error) {
		if (error instanceof Error) {
			console.error('Error:', error.message);
		} else {
			console.error('Unexpected error:', error);
		}
		return { sgv: 0, direction: "", date: 0 };
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