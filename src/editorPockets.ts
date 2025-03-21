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
					preserveFocus: true,
				});
			} catch (error) {
				console.error(`Failed to open file ${resourceUri.fsPath}:`, error);
			}
		}
	}
}

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

	private _getParent(node: BaseTreeNode): BaseTreeNode | undefined {
		for (const pocket of this.treeData) {
			if (pocket.id === node.id) {
				return undefined; // 如果 node 是根节点，则没有父节点
			}
			for (const compartment of pocket.children) {
				if (compartment.id === node.id) {
					return pocket; // 找到 node 的父节点是 pocket
				}
				for (const docNode of compartment.children) {
					if (docNode.id === node.id) {
						return compartment; // 找到 node 的父节点是 compartment
					}
				}
			}
		}
		return undefined; // 如果没有找到父节点，返回 undefined
	}

	handleDrag(
		source: readonly BaseTreeNode[],
		dataTransfer: vscode.DataTransfer,
	): void {
		console.log("source", source);
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
		console.log("transferItem", transferItem);
		if (!transferItem) {
			return;
		}

		const sources = transferItem.value as BaseTreeNode[];
		if (!sources || sources.length === 0) {
			return;
		}

		// Handle drop based on target and source types
		for (const source of sources) {
			// Remove from original location
			if (target) {
				if (target instanceof PocketNode) {
					if (source instanceof PocketNode) {
						// 找到target位置，并将source放于下方
						const targetIndex = this.treeData.findIndex(
							(pocket) => pocket.id === target.id,
						);
						if (targetIndex !== -1) {
							this.remove(source);
							this.treeData.splice(targetIndex + 1, 0, source);
						}
					} else if (source instanceof CompartmentNode) {
						this.remove(source);
						target.children.push(source);
					}
				} else if (target instanceof CompartmentNode) {
					if (source instanceof CompartmentNode) {
						const parent = this._getParent(target);
						if (parent) {
							// 找到target位置，并将source放于下方
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
							// 找到target位置，并将source放于下方
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
