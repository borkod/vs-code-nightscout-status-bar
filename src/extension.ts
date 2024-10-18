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

let errorShown = false;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate({ subscriptions }: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "nightscout-status-bar" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const myCommandId = 'nightscout-status-bar.helloWorld';
	const disposable = vscode.commands.registerCommand(myCommandId, () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from Nightscout Status Bar!');
		// fetchData()
		// .then((n) => {
		// 	if (n > 0) {
		// 		let n2 = n / 18;
		// 		vscode.window.showInformationMessage(`${n2.toFixed(2)} mmol/L`);
		// 	} 
		// })
		// .catch((error) => console.error('Error fetching data:', error));
		vscode.window.showInformationMessage(`HELLO WORLD!`);
	});

	// create a new status bar item
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = myCommandId;
	subscriptions.push(myStatusBarItem);

	// Run updateStatusBarItem every 5 seconds
	const interval = setInterval(updateStatusBarItem, 5000);
	// Push the interval to the subscriptions array to manage its lifecycle
	subscriptions.push({ dispose: () => clearInterval(interval) });

	// update status bar item once at start
	updateStatusBarItem();
	subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function updateStatusBarItem(): void {
	fetchData()
		.then(({ sgv, direction, date }) => {
			errorShown = false;
			if (sgv > 0) {
				let sgv2 = sgv / 18;
				let icon = getTrendIcon(direction);
				myStatusBarItem.text = `${sgv2.toFixed(2)} mmol/L ${icon}`;
				myStatusBarItem.show();
			} else {
				myStatusBarItem.hide();
			}
		})
		.catch((error) => {
			console.error('Error fetching data:', error);
			if (!errorShown) {
				vscode.window.showErrorMessage(`Error fetching data: ${error.message || error}`);
				errorShown = true;
			}
			myStatusBarItem.hide();
		});
}

// Async function to perform the GET request
async function fetchData(): Promise<DataResult> {
	// Load URL and API_KEY from environment variables
	//const URL = process.env.URL;
	//const API_KEY = process.env.API_KEY;

	const URL_PARAM = 'b3o.mooo.com';
	const API_KEY = '';

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
			const { sgv, direction, date } = data[0];

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