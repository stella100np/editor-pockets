// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import {
	addFileToPocket,
	addPocket,
	exportPockets,
	filterPockets,
	importPockets,
	linkBranch,
	openPocket,
	removePocket,
	renamePocket,
	saveTabs,
	togglePocketSetting,
	unlinkBranch,
} from "./commands";
import { MyTreeDataProvider } from "./treeView";
import { GitBranchManager } from "./utils/gitBranchManager";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	const treeProvider = new MyTreeDataProvider(context);
	const gitBranchManager = new GitBranchManager(treeProvider);
	gitBranchManager.initialize();

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"editor-pockets.filterPockets",
			filterPockets(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.addPocket",
			addPocket(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.saveTabs",
			saveTabs(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.renamePocket",
			renamePocket(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.remove",
			removePocket(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.openPocket",
			openPocket(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.linkBranch",
			linkBranch(treeProvider, gitBranchManager),
		),
		vscode.commands.registerCommand(
			"editor-pockets.unlinkBranch",
			unlinkBranch(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.togglePocketSetting",
			togglePocketSetting(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.exportPockets",
			exportPockets(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.importPockets",
			importPockets(treeProvider),
		),
		vscode.commands.registerCommand(
			"editor-pockets.addFileToPocket",
			addFileToPocket(treeProvider),
		),
	);
}
