const vscode = require("vscode");
const { runAgent } = require("./vss.js");

function activate(context) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );

  statusBarItem.text = "$(robot) CodeCritic Ready";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  console.log("CodeCritic Activated");

  const disposable = vscode.commands.registerCommand(
    "codecritic.runReview",
    async () => {
      try {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
          vscode.window.showErrorMessage("Please open a project folder first.");
          return;
        }

        // Ask for API Key
        const apiKey = await vscode.window.showInputBox({
          title: "Enter Gemini API Key",
          password: true,
          ignoreFocusOut: true,
          placeHolder: "Paste your Gemini API key here"
        });

        if (!apiKey) {
          vscode.window.showErrorMessage("API Key is required to run CodeCritic.");
          return;
        }

        const projectPath = workspace.uri.fsPath;

        statusBarItem.text = "$(sync~spin) Code Review Running…";
        vscode.window.showInformationMessage("CodeCritic is reviewing your project...");

        const summary = await runAgent(projectPath, apiKey);

        statusBarItem.text = "$(check) Code Review Complete";
        vscode.window.showInformationMessage("CodeCritic Review Completed");

        const panel = vscode.window.createWebviewPanel(
          "codeCriticReport",
          "CodeCritic Review Report",
          vscode.ViewColumn.Beside,
          { retainContextWhenHidden: true }
        );

        panel.webview.html = `
          <html>
            <body style="font-family: Consolas, monospace; white-space: pre-wrap; padding: 20px;">
              ${summary || "Review finished."}
            </body>
          </html>
        `;

        setTimeout(() => {
          statusBarItem.text = "$(robot) CodeCritic Ready";
        }, 4000);

      } catch (err) {
        console.error(err.message);
        statusBarItem.text = "$(error) Review Failed";
        vscode.window.showErrorMessage("CodeCritic Failed: " + err.message);

        setTimeout(() => {
          statusBarItem.text = "$(robot) CodeCritic Ready";
        }, 4000);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
