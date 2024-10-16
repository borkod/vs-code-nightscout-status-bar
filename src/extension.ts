// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';


let myStatusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate({ subscriptions }: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "nightscout-status-bar" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const myCommandId = 'nightscout-status-bar.helloWorld';
	const disposable = vscode.commands.registerCommand(myCommandId, () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from Nightscout Status Bar!');
		fetchData()
		.then((n) => {
			if (n > 0) {
				let n2 = n / 18;
				vscode.window.showInformationMessage(`${n2.toFixed(2)} mmol/L`);
			} 
		})
		.catch((error) => console.error('Error fetching data:', error));
	});

	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = myCommandId;
	subscriptions.push(myStatusBarItem);

	// register some listener that make sure the status bar 
	// item always up-to-date
	// subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	// subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));

	// Run updateStatusBarItem every 5 seconds
	const interval = setInterval(updateStatusBarItem, 5000);
	// Push the interval to the subscriptions array to manage its lifecycle
	subscriptions.push({ dispose: () => clearInterval(interval) });

	// update status bar item once at start
	updateStatusBarItem();
	//context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function updateStatusBarItem(): void {
	fetchData()
		.then((n) => {
			if (n > 0) {
				let n2 = n / 18;
				myStatusBarItem.text = `${n2.toFixed(2)} mmol/L`;
				myStatusBarItem.show();
			} else {
				myStatusBarItem.hide();
			}
		})
		.catch((error) => console.error('Error fetching data:', error));
}

function getNumberOfSelectedLines(): number {
	return Math.floor(Math.random() * (15 - 5 + 1)) + 5;
}

// Async function to perform the GET request
async function fetchData(): Promise<number> {
	// Load URL and API_KEY from environment variables
	//const URL = process.env.URL;
	//const API_KEY = process.env.API_KEY;

	const URL_PARAM = 'b3o.mooo.com';
	const API_KEY = '';

	// Validate that URL and API_KEY are provided
	if (!URL_PARAM || !API_KEY) {
		console.error('Error: URL and API_KEY must be set in environment variables.');
		process.exit(1);
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
					res.resume(); // Consume response data to free up memory
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

		// Extract the 'sgv' value
		if (Array.isArray(data) && data.length > 0) {
			const sgvValue = data[0].sgv;
			console.log('SGV Value:', sgvValue);
			return sgvValue;
		} else {
			console.error('No data received or data is not an array.');
			return 0;
		}

    } catch (error) {
		if (error instanceof Error) {
			console.error('Error:', error.message);
		} else {
			console.error('Unexpected error:', error);
		}
		return 0;
	}
}