// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MyTreeDataProvider, type MyTreeNode, getRepo } from "./editorPockets";

function checkNode(node: MyTreeNode) {
	if (!node) {
		vscode.window.showWarningMessage(
			vscode.l10n.t(
				"Please use the buttons in the explorer instead of using the commands",
			),
		);
		return false;
	}
	return true;
}

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
		let currentBranch = repo?.state.HEAD?.name;
		repo?.state.onDidChange((e) => {
			const newBranch = repo?.state.HEAD?.name;
			if (newBranch && newBranch !== currentBranch) {
				currentBranch = newBranch;
				const node = branchesMap.get(newBranch);
				if (node) {
					treeProvider.openPocket(node);
				}
			}
		});
	}, 3000);

	context.subscriptions.push(
		vscode.window.createTreeView("EditorPockets", {
			treeDataProvider: treeProvider,
			showCollapseAll: true,
		}),
		vscode.commands.registerCommand("extension.addEntry", () => {
			treeProvider.addEntry();
		}),
		vscode.commands.registerCommand("editor-pockets.saveTabs", () =>
			treeProvider.beforeAddTabs(),
		),
		// 重命名口袋
		vscode.commands.registerCommand(
			"extension.renamePocket",
			(node: MyTreeNode) => checkNode(node) && treeProvider.renamePocket(node),
		),
		// 删除口袋
		vscode.commands.registerCommand(
			"editor-pockets.remove",
			(node: MyTreeNode) => checkNode(node) && treeProvider.remove(node),
		),
		vscode.commands.registerCommand(
			"extension.openPocket",
			(node: MyTreeNode) => checkNode(node) && treeProvider.openPocket(node),
		),
		vscode.commands.registerCommand(
			"extension.linkBranch",
			(node: MyTreeNode) => {
				checkNode(node) && treeProvider.linkGitBranch(node, branchesMap);
			},
		),
		vscode.commands.registerCommand(
			"extension.unlinkBranch",
			(node: MyTreeNode) => {
				if (checkNode(node)) {
					node.description = undefined;
					node.branch = undefined;
					branchesMap.delete(node.label);
					treeProvider.refresh();
				}
			},
		),
		vscode.commands.registerCommand(
			"extension.togglePocketSetting",
			(node: MyTreeNode) => {
				if (checkNode(node)) {
					node.isAutoCloseOthers = !node.isAutoCloseOthers;
					node.description = `🌿${node.isAutoCloseOthers ? "🚀" : ""} ${node.branch}`;
					treeProvider.refresh();
				}
			},
		),
	);
}
