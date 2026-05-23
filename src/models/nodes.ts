import { dirname, relative } from "node:path";
import { nanoid } from "nanoid";
import * as vscode from "vscode";
import { type BaseTreeNode, ContextValue } from "../types/index";

export class PocketNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	private _isAutoCloseOthers = false;
	private _branch: string | undefined;

	public get branch(): string | undefined {
		return this._branch;
	}

	public set branch(value: string | undefined) {
		if (this._branch !== value) {
			this._branch = value;
			this.updateDescription();
		}
	}

	public get isAutoCloseOthers(): boolean {
		return this._isAutoCloseOthers;
	}

	public set isAutoCloseOthers(value: boolean) {
		if (this._isAutoCloseOthers !== value) {
			this._isAutoCloseOthers = value;
			this.updateDescription();
		}
	}

	constructor(public label: string) {
		super(label);
		this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		this.contextValue = ContextValue.POCKET;
		this.id = nanoid();
	}

	private updateDescription() {
		let _desc = `${this._isAutoCloseOthers ? "🚀" : ""}`;
		if (this._branch) {
			_desc = `${_desc}🌿${this._branch}`;
		}
		if (_desc) {
			this.description = _desc;
		} else {
			this.description = undefined;
		}
	}
}

export class EditorGroupNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	constructor(public label: string) {
		super(label);
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = ContextValue.EDITOR_GROUP;
		this.id = nanoid();
	}
}

export class DocNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	constructor(resourceUri: vscode.Uri) {
		super(resourceUri);

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder is opened.");
		}

		const workspaceFolder = workspaceFolders[0];
		const absolutePath = resourceUri.fsPath;
		const relativePath = relative(workspaceFolder.uri.fsPath, absolutePath);
		const folderRelativePath = dirname(relativePath);

		this.description =
			folderRelativePath === "." ? undefined : folderRelativePath;
		this.command = {
			command: "vscode.open",
			title: "Open File",
			arguments: [resourceUri],
		};
		this.id = nanoid();
	}
}
