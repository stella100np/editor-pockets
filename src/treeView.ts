import * as vscode from "vscode";
import { DocNode, EditorGroupNode, PocketNode } from "./models/nodes";
import { deserializePockets, serializePockets } from "./storage";
import { type BaseTreeNode, ContextValue } from "./types/index";
import { openFilesInGroup } from "./utils/help";

const WORKSPACESTATE_KEY = "editorpocketstorage";

export class MyTreeDataProvider
	implements
		vscode.TreeDataProvider<BaseTreeNode>,
		vscode.TreeDragAndDropController<BaseTreeNode>
{
	private treeData: PocketNode[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<BaseTreeNode | undefined> =
		new vscode.EventEmitter<BaseTreeNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<BaseTreeNode | undefined> =
		this._onDidChangeTreeData.event;
	private _workspaceState: vscode.Memento;

	dropMimeTypes = ["application/vnd.code.tree.editorpockets"];
	dragMimeTypes = ["application/vnd.code.tree.editorpockets"];

	constructor(ctx: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView("EditorPockets", {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: this,
		});
		ctx.subscriptions.push(view);
		this._workspaceState = ctx.workspaceState;
		const storedData = this._workspaceState.get(WORKSPACESTATE_KEY, []);
		this.treeData = deserializePockets(storedData);
	}

	getRootNode(): PocketNode[] {
		return this.treeData;
	}

	getTreeItem(element: BaseTreeNode): vscode.TreeItem {
		if (element.contextValue === ContextValue.POCKET) {
			element.iconPath = new vscode.ThemeIcon("folder-library");
		} else if (element.contextValue === ContextValue.EDITOR_GROUP) {
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
		this._onDidChangeTreeData.fire(undefined);
		const serializedData = serializePockets(this.treeData);
		this._workspaceState.update(WORKSPACESTATE_KEY, serializedData);
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
			const pocketName = await this.addPocket();
			if (!pocketName) {
				return;
			}
		}
		const nodes = this.treeData.map((v) => v.label).filter((v) => v);
		const label = `$(add) ${vscode.l10n.t("Create a new pocket")}`;
		const items: vscode.QuickPickItem[] = [
			{
				label,
			},
			{ label: "", kind: vscode.QuickPickItemKind.Separator },
		];
		items.push(...nodes.map((v) => ({ label: v })));
		const selectedLabel = await vscode.window.showQuickPick(items, {
			placeHolder: vscode.l10n.t("Choose a pocket"),
		});
		if (selectedLabel?.label === label) {
			return await this.addPocket();
		}
		return selectedLabel?.label;
	}

	async checkNode(node?: PocketNode) {
		if (!node) {
			const selectedLabel = await this._pickUpPocket();
			return this.treeData.find((item) => item.label === selectedLabel);
		}
		return node;
	}

	async saveTabs2Pocket() {
		const targetItem = await this.checkNode();
		if (targetItem) {
			const result = [];
			const allTabs = vscode.window.tabGroups.all;
			for (let i = 0; i < allTabs.length; i++) {
				const splitedList = allTabs[i];
				const group = new EditorGroupNode(
					vscode.l10n.t("Group {0}", splitedList.viewColumn),
				);

				for (let j = 0; j < splitedList.tabs.length; j++) {
					const tab = splitedList.tabs[j];
					if (tab.input instanceof vscode.TabInputText) {
						const docNode = new DocNode(tab.input.uri);
						group.children.push(docNode);
					}
				}
				result.push(group);
			}

			targetItem.children = result;
			this.refresh();
		}
	}

	remove(targetItem: BaseTreeNode) {
		if (!targetItem.id) {
			return;
		}
		const location = this._findNodeLocation(targetItem.id);
		if (location) {
			location.parent.splice(location.index, 1);
			this.refresh();
		}
	}

	// 构建节点 id → { parent数组, index } 的索引，实现 O(1) 定位
	private _findNodeLocation(
		id: string,
	): { parent: BaseTreeNode[]; index: number } | undefined {
		for (let i = 0; i < this.treeData.length; i++) {
			const pocket = this.treeData[i];
			if (pocket.id === id) {
				return { parent: this.treeData, index: i };
			}
			for (let j = 0; j < pocket.children.length; j++) {
				const group = pocket.children[j];
				if (group.id === id) {
					return { parent: pocket.children, index: j };
				}
				for (let k = 0; k < group.children.length; k++) {
					if (group.children[k].id === id) {
						return { parent: group.children, index: k };
					}
				}
			}
		}
		return undefined;
	}

	async openPocket(targetItem?: PocketNode) {
		const node = await this.checkNode(targetItem);
		if (node) {
			if (node.isAutoCloseOthers) {
				await vscode.commands.executeCommand(
					"workbench.action.closeAllEditors",
				);
			}
			let targetGroup = vscode.window.activeTextEditor
				? vscode.window.activeTextEditor.viewColumn
				: undefined;
			for (let i = 0; i < node.children.length; i++) {
				const groupNode = node.children[i];
				await openFilesInGroup(
					groupNode.children.map((v) => v.resourceUri),
					targetGroup,
				);
				targetGroup = vscode.ViewColumn.Beside;
			}
		}
	}

	getNodeByGitBranch(branchName: string) {
		return this.treeData.find((v) => v.branch === branchName);
	}

	private _getParent(node: BaseTreeNode): BaseTreeNode | undefined {
		for (const pocket of this.treeData) {
			if (pocket.id === node.id) {
				return undefined;
			}
			for (const group of pocket.children) {
				if (group.id === node.id) {
					return pocket;
				}
				for (const docNode of group.children) {
					if (docNode.id === node.id) {
						return group;
					}
				}
			}
		}
		return undefined;
	}

	handleDrag(
		source: readonly BaseTreeNode[],
		dataTransfer: vscode.DataTransfer,
	): void {
		dataTransfer.set(
			"application/vnd.code.tree.editorpockets",
			new vscode.DataTransferItem(source),
		);
	}

	async handleDrop(
		target: BaseTreeNode | undefined,
		dataTransfer: vscode.DataTransfer,
	): Promise<void> {
		const transferItem = dataTransfer.get(
			"application/vnd.code.tree.editorpockets",
		);
		if (!transferItem) {
			return;
		}

		const sources = transferItem.value as BaseTreeNode[];
		if (!sources || sources.length === 0) {
			return;
		}

		for (const source of sources) {
			if (target) {
				if (target instanceof PocketNode) {
					if (source instanceof PocketNode) {
						const targetIndex = this.treeData.findIndex(
							(pocket) => pocket.id === target.id,
						);
						if (targetIndex !== -1) {
							this.remove(source);
							this.treeData.splice(targetIndex + 1, 0, source);
						}
					} else if (source instanceof EditorGroupNode) {
						this.remove(source);
						target.children.push(source);
					}
				} else if (target instanceof EditorGroupNode) {
					if (source instanceof EditorGroupNode) {
						const parent = this._getParent(target);
						if (parent) {
							this.remove(source);
							parent.children.splice(
								parent.children.indexOf(target) + 1,
								0,
								source,
							);
						}
					} else if (source instanceof DocNode) {
						this.remove(source);
						target.children.push(source);
					}
				} else if (target instanceof DocNode) {
					if (source instanceof DocNode) {
						const parent = this._getParent(target);
						if (parent) {
							this.remove(source);
							parent.children.splice(
								parent.children.indexOf(target) + 1,
								0,
								source,
							);
						}
					}
				}
			}
		}

		this.refresh();
	}
}
