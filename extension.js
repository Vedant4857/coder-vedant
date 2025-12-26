const vscode = require('vscode');
const { runAgent } = require("./vss.js");

function activate(context) {

	const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
);

statusBarItem.text = "$(robot) Ready for AI Review";
statusBarItem.show();

context.subscriptions.push(statusBarItem);


	console.log('Coder Vedant AI Reviewer is active!');

	

	const disposable = vscode.commands.registerCommand(
    "aiReviewer.run",
    async () => {

        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            vscode.window.showErrorMessage("Open a folder first.");
            return;
        }

        const projectPath = workspace.uri.fsPath;

        // STATUS START
        statusBarItem.text = "$(sync~spin) AI Review Running…";
        statusBarItem.show();

        vscode.window.showInformationMessage("Running AI C++ Review...");

        try {
            const summary = await runAgent(projectPath);

            statusBarItem.text = "$(check) AI Review Complete";
            vscode.window.showInformationMessage("AI Review Finished!");

            // show panel
            const panel = vscode.window.createWebviewPanel(
                "aiReview",
                "AI C++ Code Review Report",
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = `<pre>${summary || "Done!"}</pre>`;

            // Hide after few seconds
            setTimeout(() => {
                statusBarItem.text = "$(robot) Ready for AI Review";
            }, 4000);

        } catch (err) {
            statusBarItem.text = "$(error) AI Review Failed";
            vscode.window.showErrorMessage("Review failed: " + err.message);

            setTimeout(() => {
                statusBarItem.text = "$(robot) Ready for AI Review";
            }, 4000);
        }
    }
);


	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
