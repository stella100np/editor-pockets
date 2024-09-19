import * as vscode from "vscode";
import type { GitExtension } from "./types/git.d.ts"; // 如果 types/git 是一个类型定义文件
import { nanoid } from "nanoid";
// 或者
// contextValue枚举
enum ContextValue {
	POCKET = "pocket",
	COMPARTMENT = "compartment",
	DOCUMENT = "document",
}
const WORKSPACESTATE_KEY = "editorpocketstorage";

export class MyTreeNode extends vscode.TreeItem {
	public children: MyTreeNode[] = [];
	public isAutoCloseOthers = false;
	public branch: string | undefined;
	constructor(
		public label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
		super(label, collapsibleState);
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
				await vscode.window.showTextDocument(uri, {
					viewColumn: group,
					preview: false,
				});
			} catch (error) {
				console.error(`Failed to open file ${filePath}:`, error);
			}
		}
	}
}

export function getRepo() {
	const gitExtension =
		vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
	const git = gitExtension?.getAPI(1);
	if (Array.isArray(vscode.workspace.workspaceFolders) && git) {
		return git.getRepository(vscode.workspace.workspaceFolders[0].uri);
	}
}

export class MyTreeDataProvider implements vscode.TreeDataProvider<MyTreeNode> {
	private treeData: MyTreeNode[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<MyTreeNode | undefined> =
		new vscode.EventEmitter<MyTreeNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<MyTreeNode | undefined> =
		this._onDidChangeTreeData.event;
	private _workspaceState: vscode.Memento;
	constructor(workspaceState: vscode.Memento) {
		this._workspaceState = workspaceState;
		this.treeData = this._workspaceState.get(WORKSPACESTATE_KEY, []);
	}
	getRootNode(): MyTreeNode[] {
		return this.treeData;
	}

	getTreeItem(element: MyTreeNode): vscode.TreeItem {
		if (element.contextValue === ContextValue.POCKET) {
			element.iconPath = new vscode.ThemeIcon("folder-library");
		} else if (element.contextValue === ContextValue.COMPARTMENT) {
			element.iconPath = new vscode.ThemeIcon("files");
		} else if (element.contextValue === ContextValue.DOCUMENT) {
			element.iconPath = new vscode.ThemeIcon("file");
		}
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
		this._workspaceState.update(WORKSPACESTATE_KEY, this.treeData);
	}

	async addEntry() {
		const value = await vscode.window.showInputBox({
			placeHolder: vscode.l10n.t("pocketNamePlaceholder"),
		});
		if (value) {
			const item = new MyTreeNode(
				value,
				vscode.TreeItemCollapsibleState.Collapsed,
			);
			item.id = nanoid();
			item.contextValue = ContextValue.POCKET;
			this.treeData.push(item);
			this.refresh();
		}
		return value;
	}

	async beforeAddTabs() {
		if (this.treeData.length) {
			const nodes = this.treeData.map((v) => v.label);
			const node = await vscode.window.showQuickPick(nodes, {
				placeHolder: vscode.l10n.t("choosePocketPlaceholder"),
			});
			node && this.addPocket(node);
		} else {
			const name = await this.addEntry();
			name && this.addPocket(name);
		}
	}

	addPocket(msg: string) {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage(vscode.l10n.t("noEditorMsg"));
			return;
		}

		// biome-ignore lint/style/useConst: <explanation>
		let targetItem = this.treeData.find((item) => {
			return item.label === msg;
		});
		if (targetItem) {
			const result: MyTreeNode[] = [];
			const allTabs = vscode.window.tabGroups.all;
			for (let i = 0; i < allTabs.length; i++) {
				const splitedList = allTabs[i];
				const compartment = new MyTreeNode(
					vscode.l10n.t("group {0}", splitedList.viewColumn),
					vscode.TreeItemCollapsibleState.Expanded,
				);
				compartment.contextValue = ContextValue.COMPARTMENT;
				compartment.id = nanoid();

				for (let j = 0; j < splitedList.tabs.length; j++) {
					const tab = splitedList.tabs[j];
					if (tab.input instanceof vscode.TabInputText) {
						const docNode = new MyTreeNode(
							tab.label,
							vscode.TreeItemCollapsibleState.None,
						);
						docNode.contextValue = ContextValue.DOCUMENT;
						docNode.description = tab.input.uri.fsPath;
						docNode.id = nanoid();
						compartment.children.push(docNode);
					}
				}
				result.push(compartment);
			}

			targetItem.children = result;
			this.refresh();
		}
	}

	remove(targetItem: MyTreeNode) {
		for (let i = 0; i < this.treeData.length; i++) {
			const pocket = this.treeData[i];
			if (pocket.id === targetItem.id) {
				// 删除
				this.treeData.splice(i, 1);
				this.refresh();
				return;
			}
			for (let j = 0; j < pocket.children.length; j++) {
				const compartment = pocket.children[j];
				if (compartment.id === targetItem.id) {
					// 删除
					pocket.children.splice(j, 1);
					this.refresh();
					return;
				}
				for (let k = 0; k < compartment.children.length; k++) {
					const docNode = compartment.children[k];
					if (docNode.id === targetItem.id) {
						// 删除
						compartment.children.splice(k, 1);
						this.refresh();
						return;
					}
				}
			}
		}
	}
	async openPocket(targetItem: MyTreeNode) {
		if (targetItem.isAutoCloseOthers) {
			await vscode.commands.executeCommand("workbench.action.closeAllEditors");
		}
		// 确定目标编辑器组
		let targetGroup = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		for (let i = 0; i < targetItem.children.length; i++) {
			const compartmentNode = targetItem.children[i];
			await openFilesInGroup(
				compartmentNode.children.map((v) => v.description),
				targetGroup,
			);
			targetGroup = vscode.ViewColumn.Beside;
		}
	}
	renamePocket(targetItem: MyTreeNode) {
		vscode.window
			.showInputBox({
				value: targetItem.label,
				placeHolder: vscode.l10n.t("renamePlaceholder"),
			})
			.then((newName) => {
				if (newName) {
					targetItem.label = newName;
					this.refresh();
				}
			});
	}
	async linkGitBranch(node: MyTreeNode, branchesMap: Map<string, MyTreeNode>) {
		const repo = getRepo();
		if (repo) {
			const branches = await repo.getBranches({
				remote: true,
			});
			const branchOptions = branches
				.filter((v) => v.name !== undefined)
				.map((v) => {
					return {
						label: `$(git-branch)${v.name}`,
						value: v.name,
						description: v.commit,
					};
				});

			const targetBranch = await vscode.window.showQuickPick(branchOptions, {
				placeHolder: vscode.l10n.t("chooseBranchPlaceholder"),
			});
			const options = [
				{ label: `$(check)${vscode.l10n.t("yes")}`, value: true },
				{ label: `$(chrome-close)${vscode.l10n.t("no")}`, value: false },
			];
			// 是否自动关闭其他编辑器
			const selectedOption = await vscode.window.showQuickPick(options, {
				placeHolder: vscode.l10n.t("closeOthersPlaceholder"),
			});
			if (targetBranch?.value) {
				// remove old link
				if (branchesMap.has(targetBranch.value)) {
					const oldNode = branchesMap.get(targetBranch.value);
					if (oldNode) {
						oldNode.branch = undefined;
						oldNode.description = undefined;
					}
				}

				// add new link
				node.branch = targetBranch.value;
				node.isAutoCloseOthers = selectedOption?.value || false;
				node.description = `🌿${node.isAutoCloseOthers ? "🚀" : ""} ${node.branch}`;
				branchesMap.set(targetBranch.value, node);
				this.refresh();
			}
			// console.log(repo.state.HEAD?.name, repo.state.HEAD?.remote)
		}
	}
}
