// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MyTreeDataProvider } from "./editorPockets";
import type { BaseTreeNode, DocNode, PocketNode } from "./types/index";
import { GitBranchManager } from "./utils/gitBranchManger";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const treeProvider = new MyTreeDataProvider(context);
	const gitBranchManager = new GitBranchManager(treeProvider);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("EditorPockets", treeProvider),
		vscode.commands.registerCommand("editor-pockets.addPocket", () => {
			treeProvider.addPocket();
		}),
		vscode.commands.registerCommand("editor-pockets.saveTabs", () =>
			treeProvider.saveTabs2Pocket(),
		),
		// 重命名口袋
		vscode.commands.registerCommand(
			"extension.renamePocket",
			async (targetItem: PocketNode | undefined) => {
				const node = await treeProvider.checkNode(targetItem);
				if (node) {
					const newName = await vscode.window.showInputBox({
						value: node.label,
						placeHolder: vscode.l10n.t("Enter a new name for the pocket"),
					});
					if (newName) {
						node.label = newName;
						treeProvider.refresh();
					}
				}
			},
		),
		// 删除口袋
		vscode.commands.registerCommand(
			"editor-pockets.remove",
			(node: BaseTreeNode) => treeProvider.remove(node),
		),
		vscode.commands.registerCommand(
			"extension.openPocket",
			(node: PocketNode) => treeProvider.openPocket(node),
		),
		vscode.commands.registerCommand(
			"extension.linkBranch",
			async (targetItem: PocketNode | undefined) => {
				const node = await treeProvider.checkNode(targetItem);
				if (node) {
					const result = await gitBranchManager.pickUpBranch();
					console.log("result", result);
					if (result) {
						const { targetBranch, isAutoCloseOthers } = result;
						node.isAutoCloseOthers = isAutoCloseOthers;
						if (targetBranch) {
							const oldNode = treeProvider.getNodeByGitBranch(targetBranch);
							if (oldNode) {
								oldNode.branch = undefined;
							}
							node.branch = targetBranch;
							treeProvider.refresh();
						}
					}
				}
			},
		),
		vscode.commands.registerCommand(
			"extension.unlinkBranch",
			async (targetItem: PocketNode | undefined) => {
				const node = await treeProvider.checkNode(targetItem);
				if (node) {
					node.branch = undefined;
				}
			},
		),
		vscode.commands.registerCommand(
			"extension.togglePocketSetting",
			async (targetItem: PocketNode | undefined) => {
				const node = await treeProvider.checkNode(targetItem);
				if (node) {
					node.isAutoCloseOthers = !node.isAutoCloseOthers;
				}
			},
		),
	);
}
