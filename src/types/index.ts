import * as vscode from "vscode";
import { relative, basename, dirname } from "node:path";
import { nanoid } from "nanoid";

export enum ContextValue {
	POCKET = "pocket",
	COMPARTMENT = "compartment",
	DOCUMENT = "document",
}

export interface BaseTreeNode extends vscode.TreeItem {
	children: BaseTreeNode[];
}

export class PocketNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	private _isAutoCloseOthers = false;
	private _branch: string | undefined;

	// 使用 getter 和 setter 来处理 branch 的值
	public get branch(): string | undefined {
		return this._branch;
	}

	public set branch(value: string | undefined) {
		if (this._branch !== value) {
			this._branch = value;
			this.updateDescription();
		}
	}

	// 使用 getter 和 setter 来处理 isAutoCloseOthers 的值
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

export class CompartmentNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	constructor(public label: string) {
		super(label);
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = ContextValue.COMPARTMENT;
		this.id = nanoid();
	}
}

export class DocNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	constructor(uri: vscode.Uri) {
		super(uri);

		// 获取当前打开的工作区文件夹列表
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder is opened.");
		}

		// 选择第一个工作区作为基准（如果有多个工作区，你可能需要更复杂的逻辑来选择）
		const workspaceFolder = workspaceFolders[0];

		// 将 URI 转换为文件系统路径
		const absolutePath = uri.fsPath;

		// 计算相对于工作区根目录的路径
		const relativePath = relative(workspaceFolder.uri.fsPath, absolutePath);

		// 获取文件夹的相对路径
		const folderRelativePath = dirname(relativePath);

		// 设置 TreeItem 的 description
		this.description =
			folderRelativePath === "." ? undefined : folderRelativePath;
		this.id = nanoid();
	}
}
