import * as vscode from "vscode";
import {
	type BaseTreeNode,
	CompartmentNode,
	ContextValue,
	DocNode,
	PocketNode,
} from "./types/index";

const WORKSPACESTATE_KEY = "editorpocketstorage";

// 打开文件到指定的编辑器组
async function openFilesInGroup(
	resourceUris: (vscode.Uri | boolean | undefined)[],
	group: vscode.ViewColumn | undefined,
) {
	for (const resourceUri of resourceUris) {
		if (resourceUri instanceof vscode.Uri) {
			try {
				// 使用指定的编辑器组打开文件
				await vscode.window.showTextDocument(resourceUri, {
					viewColumn: group,
					preview: false,
				});
			} catch (error) {
				console.error(`Failed to open file ${resourceUri.fsPath}:`, error);
			}
		}
	}
}

export class MyTreeDataProvider
	implements vscode.TreeDataProvider<BaseTreeNode>
{
	private treeData: PocketNode[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<BaseTreeNode | undefined> =
		new vscode.EventEmitter<BaseTreeNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<BaseTreeNode | undefined> =
		this._onDidChangeTreeData.event;
	private _workspaceState: vscode.Memento;

	constructor(ctx: vscode.ExtensionContext) {
		this._workspaceState = ctx.workspaceState;
		// 从工作区状态中读取数据，并进行反序列化
		// this._workspaceState.update(WORKSPACESTATE_KEY, []);
		const storedData = this._workspaceState.get(WORKSPACESTATE_KEY, []);
		this.treeData = this.deserializeNode(storedData);
	}

	getRootNode(): PocketNode[] {
		return this.treeData;
	}

	getTreeItem(element: BaseTreeNode): vscode.TreeItem {
		if (element.contextValue === ContextValue.POCKET) {
			element.iconPath = new vscode.ThemeIcon("folder-library");
		} else if (element.contextValue === ContextValue.COMPARTMENT) {
			element.iconPath = new vscode.ThemeIcon("files");
		}
		return element;
	}

	getChildren(element?: BaseTreeNode): Thenable<BaseTreeNode[]> {
		if (!element) {
			return Promise.resolve(this.treeData);
		}
		return Promise.resolve(element.children);
	}

	refresh() {
		// 更新数据
		this._onDidChangeTreeData.fire(undefined);
		// 存储数据
		const serializedData = this.serializeNode();
		this._workspaceState.update(WORKSPACESTATE_KEY, serializedData);
	}

	// 自定义序列化方法
	private serializeNode() {
		return this.treeData.map((pocket) => ({
			...pocket,
			children: (pocket.children || []).map((compartment) => ({
				...compartment,
				children: (compartment.children || []).map(
					(doc) => doc.resourceUri?.fsPath,
				),
			})),
		}));
	}

	// 自定义反序列化方法
	private deserializeNode(storedData: PocketNode[]): PocketNode[] {
		return storedData.map((pocketData) => {
			const pocket = new PocketNode(pocketData.label);
			Object.assign(pocket, pocketData);
			pocket.children = (pocketData.children || []).map((compartmentData) => {
				const compartment = new CompartmentNode(
					compartmentData.label as string,
				);
				compartment.children = (compartmentData.children || []).map(
					(docStr) => {
						// @ts-ignore
						return new DocNode(vscode.Uri.file(docStr));
					},
				) as BaseTreeNode[];
				return compartment;
			});
			return pocket;
		});
	}
	public async addPocket() {
		const value = await vscode.window.showInputBox({
			placeHolder: vscode.l10n.t("Enter your pocket`s name"),
		});
		if (value) {
			const item = new PocketNode(value);
			this.treeData.push(item);
			this.refresh();
		}
		return value;
	}

	private async _pickUpPocket() {
		if (this.treeData.length === 0) {
			await this.addPocket();
		}
		const nodes = this.treeData.map((v) => v.label).filter((v) => v);
		const selectedLabel = await vscode.window.showQuickPick(nodes, {
			placeHolder: vscode.l10n.t("Choose a pocket"),
		});
		return selectedLabel;
	}

	async checkNode(node?: PocketNode) {
		if (!node) {
			const selectedLabel = await this._pickUpPocket();
			return this.treeData.find((item) => item.label === selectedLabel);
		}
		return node;
	}

	async saveTabs2Pocket() {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("No editor is currently active!"),
			);
			return;
		}

		// biome-ignore lint/style/useConst: <explanation>
		let targetItem = await this.checkNode();
		if (targetItem) {
			const result = [];
			const allTabs = vscode.window.tabGroups.all;
			for (let i = 0; i < allTabs.length; i++) {
				const splitedList = allTabs[i];
				const compartment = new CompartmentNode(
					vscode.l10n.t("Group {0}", splitedList.viewColumn),
				);

				for (let j = 0; j < splitedList.tabs.length; j++) {
					const tab = splitedList.tabs[j];
					if (tab.input instanceof vscode.TabInputText) {
						const docNode = new DocNode(tab.input.uri);
						compartment.children.push(docNode);
					}
				}
				result.push(compartment);
			}

			targetItem.children = result;
			this.refresh();
		}
	}

	remove(targetItem: BaseTreeNode) {
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

	async openPocket(targetItem?: PocketNode) {
		const node = await this.checkNode(targetItem);
		if (node) {
			if (node.isAutoCloseOthers) {
				await vscode.commands.executeCommand(
					"workbench.action.closeAllEditors",
				);
			}
			// 确定目标编辑器组
			let targetGroup = vscode.window.activeTextEditor
				? vscode.window.activeTextEditor.viewColumn
				: undefined;
			for (let i = 0; i < node.children.length; i++) {
				const compartmentNode = node.children[i];
				await openFilesInGroup(
					compartmentNode.children.map((v) => v.resourceUri),
					targetGroup,
				);
				targetGroup = vscode.ViewColumn.Beside;
			}
		}
	}

	getNodeByGitBranch(branchName: string) {
		return this.treeData.find((v) => v.branch === branchName);
	}
}
