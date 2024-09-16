// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
	getRepo,
	MyTreeDataProvider,
	type MyTreeNode,
} from "./editorPockets";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const treeProvider = new MyTreeDataProvider(context.workspaceState);
	const branchesMap = new Map<string, MyTreeNode>();
	const root = treeProvider.getRootNode();
	for (let i = 0; i < root.length; i++) {
		const node = root[i];
		if (typeof node.description === "string") {
			branchesMap.set(node.description, node);
		}
	}

	setTimeout(() => {
		const repo = getRepo();
		console.log(repo);
		let currentBranch = repo?.state.HEAD?.name;
		repo?.state.onDidChange((e) => {
			const newBranch = repo?.state.HEAD?.name;
			if (newBranch && newBranch !== currentBranch) {
				currentBranch = newBranch;
				const node = branchesMap.get(newBranch);
				console.log(node);
				if (node) {
					treeProvider.openPocket(node);
				}
			}
		});
	}, 3000);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("EditorPockets", treeProvider),
		vscode.commands.registerCommand("extension.addEntry", () => {
			treeProvider.addEntry();
		}),
		vscode.commands.registerCommand("extension.saveTabsToPocket", () =>
			treeProvider.beforeAddTabs(),
		),
		// 重命名口袋
		vscode.commands.registerCommand(
			"extension.renamePocket",
			(node: MyTreeNode) => treeProvider.renamePocket(node),
		),
		// 删除口袋
		vscode.commands.registerCommand(
			"extension.removePocket",
			(node: MyTreeNode) => treeProvider.removeCompartments(node),
		),
		vscode.commands.registerCommand(
			"extension.openPocket",
			(node: MyTreeNode) => treeProvider.openPocket(node),
		),
		vscode.commands.registerCommand(
			"extension.linkBranch",
			(node: MyTreeNode) => {
				treeProvider.linkGitBranch(node, branchesMap);
			},
		),
		vscode.commands.registerCommand(
			"extension.unlinkBranch",
			(node: MyTreeNode) => {
				node.description = undefined;
				branchesMap.delete(node.label);
				treeProvider.refresh();
			},
		),
	);
}
