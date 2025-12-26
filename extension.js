const vscode = require('vscode');
const { runAgent } = require("./vss.js");

function activate(context) {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left
    );

    statusBarItem.text = "$(robot) Ready for Code Review";
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    console.log('CodeCritic is active!');

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
            statusBarItem.text = "$(sync~spin) Code Review Running…";
            statusBarItem.show();

            vscode.window.showInformationMessage("Running Code Review...");

            try {
                const summary = await runAgent(projectPath);

                statusBarItem.text = "$(check) Code Review Complete";
                vscode.window.showInformationMessage("Code Review Finished!");

                const panel = vscode.window.createWebviewPanel(
                    "aiReview",
                    "AI Code Review Report",
                    vscode.ViewColumn.Beside,
                    {}
                );

                panel.webview.html = `<pre>${summary || "Done!"}</pre>`;

                setTimeout(() => {
                    statusBarItem.text = "$(robot) Ready for Code Review";
                }, 4000);

            } catch (err) {
                statusBarItem.text = "$(error) Code Review Failed";
                vscode.window.showErrorMessage("Review failed: " + err.message);

                setTimeout(() => {
                    statusBarItem.text = "$(robot) Ready for Code Review";
                }, 4000);
            }
        }
    );

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
