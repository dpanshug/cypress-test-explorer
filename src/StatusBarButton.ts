import * as vscode from 'vscode';

export function createStatusBarButton(context: vscode.ExtensionContext) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    statusBarItem.text = 'Start cypress server';

    statusBarItem.command = 'extension.handleButtonClick';

    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    const disposable = vscode.commands.registerCommand('extension.handleButtonClick', () => {
        handleButtonClick(statusBarItem);
    })

    context.subscriptions.push(disposable)
}

function handleButtonClick(statusBarItem:vscode.StatusBarItem) {
    if(statusBarItem.text === 'Start cypress server') {
    statusBarItem.text = `$(sync~spin) Starting cypress server`
    } else {
        statusBarItem.text = 'Start cypress server'
    }

    setTimeout(() => {
        statusBarItem.text = `🟢 Stop server`
    }, 10000)
}