import * as vscode from "vscode";
import type {  GitExtension } from "./git";

// contextValue枚举
enum ContextValue {
	POCKET = "pocket",
	COMPARTMENT = "compartment",
	DOCUMENT = "document",
}
const WORKSPACESTATE_KEY = "editorpocketstorage";

export class MyTreeNode extends vscode.TreeItem {
	public children: MyTreeNode[] = [];
	public alias = "";
	constructor(
		public label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public ctxValue: ContextValue,
	) {
		super(label, collapsibleState);
		this.contextValue = ctxValue;
	}
}

// 打开文件到指定的编辑器组
async function openFilesInGroup(
	filePaths: (string | boolean | undefined)[],
	group: vscode.ViewColumn | undefined,
) {
	for (const filePath of filePaths) {
		if (typeof filePath === "string") {
			try {
				// 将文件路径转换为URI
				const uri = vscode.Uri.file(filePath);
				// 使用指定的编辑器组打开文件
				await vscode.window.showTextDocument(uri, { viewColumn: group, preview: false });
			} catch (error) {
				console.error(`Failed to open file ${filePath}:`, error);
			}
		}
	}
}

export class MyTreeDataProvider implements vscode.TreeDataProvider<MyTreeNode> {
	private treeData: MyTreeNode[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<MyTreeNode | undefined> =
		new vscode.EventEmitter<MyTreeNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<MyTreeNode | undefined> =
		this._onDidChangeTreeData.event;
	private _workspaceState: vscode.Memento;
	constructor(
		workspaceState: vscode.Memento
	) {
		this._workspaceState = workspaceState
		this.treeData = this._workspaceState.get(WORKSPACESTATE_KEY, [])
	}

	getPockets() {
		return this.treeData;
	}

	getTreeItem(element: MyTreeNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: MyTreeNode): Thenable<MyTreeNode[]> {
		if (!element) {
			return Promise.resolve(this.treeData);
		}
		return Promise.resolve(element.children);
	}

	refresh() {
		// 更新数据
		this._onDidChangeTreeData.fire(undefined);
		// 存储数据
		this._workspaceState.update(WORKSPACESTATE_KEY, this.treeData)
	}

	async addEntry() {
		const value = await vscode.window.showInputBox({
			placeHolder: "请输入要添加的条目",
		});
		if (value) {
			const item = new MyTreeNode(
				value,
				vscode.TreeItemCollapsibleState.Collapsed,
				ContextValue.POCKET,
			);
			this.treeData.push(item);
			this.refresh();
		}
		return value;
	}

	async beforeAddTabs() {
		if (this.treeData.length) {
			const nodes = this.treeData.map((v) => v.label);
			const node = await vscode.window.showQuickPick(nodes, {
				placeHolder: "选择哪个组",
			});
			node && this.addPocket(node);
		} else {
			const name = await this.addEntry();
			name && this.addPocket(name);
		}
	}

	addPocket(msg: string) {
		console.log(msg);
		// biome-ignore lint/style/useConst: <explanation>
		let targetItem = this.treeData.find((item) => {
			return item.label === msg;
		});
		if (targetItem) {
			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				vscode.window.showErrorMessage("No editor is currently active.");
				return;
			}
			const result: MyTreeNode[] = [];
			console.log(vscode.window.tabGroups.all);
			const allTabs = vscode.window.tabGroups.all;
			for (let i = 0; i < allTabs.length; i++) {
				const splitedList = allTabs[i];
				const compartment = new MyTreeNode(
					`group${splitedList.viewColumn}`,
					vscode.TreeItemCollapsibleState.Expanded,
					ContextValue.COMPARTMENT,
				);

				for (let j = 0; j < splitedList.tabs.length; j++) {
					const tab = splitedList.tabs[j];
					if (tab.input instanceof vscode.TabInputText) {
						const docNode = new MyTreeNode(
							tab.label,
							vscode.TreeItemCollapsibleState.None,
							ContextValue.DOCUMENT,
						);
						docNode.description = tab.input.uri.fsPath;
						compartment.children.push(docNode);
					}
				}
				result.push(compartment);
			}

			targetItem.children = result
			this.refresh();
		}
	}
	removeCompartments(targetItem: MyTreeNode | undefined) {
		if (targetItem) {
			const index = this.treeData.findIndex(
				(item) => item.label === targetItem.label,
			);
			if (index !== -1) {
				this.treeData.splice(index, 1);
				this.refresh();
			}
		}
	}
	async openPocket(node: MyTreeNode) {
		// 确定目标编辑器组
		let targetGroup = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		// await openFilesInGroup(filePaths, targetGroup);
		for (let i = 0; i < node.children.length; i++) {
			const compartmentNode = node.children[i];
			await openFilesInGroup(
				compartmentNode.children.map((v) => v.description),
				targetGroup,
			);
			targetGroup = vscode.ViewColumn.Beside;
		}
		vscode.window.showInformationMessage("All files opened successfully.");
	}
	renamePocket(node: MyTreeNode) {
		vscode.window
			.showInputBox({
				value: node.label,
				placeHolder: "请输入新名称",
			})
			.then((newName) => {
				if (newName) {
					node.label = newName;
					if (node.ctxValue === ContextValue.DOCUMENT) {
						node.alias = newName
					}
					this.refresh();
				}
			});
	}
	async linkGitBranch(node: MyTreeNode) {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
		const git = gitExtension?.getAPI(1);
		if (vscode.workspace.workspaceFolders) {
			const repo = git?.getRepository(vscode.workspace.workspaceFolders[0].uri)
			if (repo) {
				const branches = await repo.getBranches({
					remote: true
				})
				const branchesName = branches.map(v => v.name).filter( v=> v!==undefined)
				const targetBranchName =  await vscode.window.showQuickPick(branchesName, { placeHolder: "选择分支" })
				if (targetBranchName) {
					node.description = targetBranchName
					this.refresh()
				}
				// console.log(repo.state.HEAD?.name, repo.state.HEAD?.remote)
			}
		}
	}
}
