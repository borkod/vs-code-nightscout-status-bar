// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
		const n = getNumberOfSelectedLines();
		vscode.window.showInformationMessage(`Yeah, ${n} line(s) selected... Keep going!`);
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
	const n = getNumberOfSelectedLines();
	if (n > 0) {
		myStatusBarItem.text = `$(megaphone) ${n} line(s) selected`;
		myStatusBarItem.show();
	} else {
		myStatusBarItem.hide();
	}
}

function getNumberOfSelectedLines(): number {
	return Math.floor(Math.random() * (15 - 5 + 1)) + 5;
}