import type * as vscode from "vscode";

export enum ContextValue {
	POCKET = "pocket",
	EDITOR_GROUP = "editorGroup",
	DOCUMENT = "document",
}

export interface BaseTreeNode extends vscode.TreeItem {
	children: BaseTreeNode[];
}
