// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MyTreeDataProvider, type MyTreeNode } from "./nodeDependencies";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const treeProvider = new MyTreeDataProvider(context.workspaceState);

	const treeView = vscode.window.registerTreeDataProvider(
		"myTreeView",
		treeProvider,
	);

	context.subscriptions.push(treeView);

	const d3 = vscode.commands.registerCommand("extension.addEntry", () => {
		// 提示输入框
		treeProvider.addEntry();
	});
	context.subscriptions.push(d3);

	const disposable = vscode.commands.registerCommand(
		"extension.showOpenFilePaths",
		() => {
			// 获取当前激活的编辑器
			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				vscode.window.showErrorMessage("No editor is currently active.");
				return;
			}

			// 获取当前编辑器所在的组
			// let result: { label: string; }[] = []
			// vscode.window.tabGroups.activeTabGroup.tabs.forEach(tab => {
			//     let label = tab.label;
			//     if (tab.input instanceof vscode.TabInputText) {
			//         label = tab.input.uri.fsPath
			//         result.push({ label })
			//     }
			// })
			// console.table(result)
		},
	);

	vscode.commands.registerCommand("extension.saveTabsToPocket", () =>
		treeProvider.beforeAddTabs(),
	);

	// 重命名口袋
	vscode.commands.registerCommand(
		"extension.renamePocket",
		(node: MyTreeNode) => treeProvider.renamePocket(node),
	);

	// 删除口袋
	vscode.commands.registerCommand(
		"extension.removePocket",
		(node: MyTreeNode) => treeProvider.removeCompartments(node),
	);

	vscode.commands.registerCommand("extension.openPocket", (node: MyTreeNode) =>
		treeProvider.openPocket(node),
	);

	context.subscriptions.push(disposable);
}
