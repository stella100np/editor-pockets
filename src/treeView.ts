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
	private _filterText = "";
	private _view: vscode.TreeView<BaseTreeNode>;
	private _originalViewTitle = "Editor Pockets";

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
		this._view = view;
		this._originalViewTitle = view.title ?? "Editor Pockets";
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
			if (this._filterText) {
				const lowerFilter = this._filterText.toLowerCase();
				return Promise.resolve(
					this.treeData.filter((pocket) =>
						pocket.label.toLowerCase().includes(lowerFilter),
					),
				);
			}
			return Promise.resolve(this.treeData);
		}
		return Promise.resolve(element.children);
	}

	refresh() {
		this._onDidChangeTreeData.fire(undefined);
		const serializedData = serializePockets(this.treeData);
		this._workspaceState.update(WORKSPACESTATE_KEY, serializedData);
	}

	private _updateFilterDisplay() {
		if (this._filterText) {
			const matchCount = this.treeData.filter((pocket) =>
				pocket.label.toLowerCase().includes(this._filterText.toLowerCase()),
			).length;
			this._view.title = vscode.l10n.t(
				'Filter "{0}" — {1} matches',
				this._filterText,
				matchCount,
			);
		} else {
			this._view.title = this._originalViewTitle;
		}
	}

	async filterPockets() {
		const value = await vscode.window.showInputBox({
			placeHolder: vscode.l10n.t("Filter pockets by name..."),
			value: this._filterText,
		});

		if (value !== undefined) {
			this._filterText = value;
			this._updateFilterDisplay();
			this.refresh();
		}
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
			const allTabs = vscode.window.tabGroups.all;

			if (allTabs.length === 1) {
				// 只有一个 tab group（未拆分编辑器栏），文档直接放在口袋下
				const docs: DocNode[] = [];
				for (const tab of allTabs[0].tabs) {
					if (tab.input instanceof vscode.TabInputText) {
						docs.push(new DocNode(tab.input.uri));
					}
				}
				targetItem.children = docs;
			} else {
				// 有多个 tab group（拆分了编辑器），保留 group 层级
				const result: EditorGroupNode[] = [];
				for (const splitedList of allTabs) {
					const group = new EditorGroupNode(
						vscode.l10n.t("Group {0}", splitedList.viewColumn),
					);

					for (const tab of splitedList.tabs) {
						if (tab.input instanceof vscode.TabInputText) {
							const docNode = new DocNode(tab.input.uri);
							group.children.push(docNode);
						}
					}
					result.push(group);
				}
				targetItem.children = result;
			}
			this.refresh();
			this._view.reveal(targetItem, { expand: true });
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
				const child = pocket.children[j];
				if (child.id === id) {
					return { parent: pocket.children, index: j };
				}
				// 仅当是 EditorGroup 时，才在其 children 中继续查找
				if (child instanceof EditorGroupNode) {
					for (let k = 0; k < child.children.length; k++) {
						if (child.children[k].id === id) {
							return { parent: child.children, index: k };
						}
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
			for (const child of node.children) {
				if (child instanceof EditorGroupNode) {
					await openFilesInGroup(
						child.children.map((v) => v.resourceUri),
						targetGroup,
					);
				} else if (child instanceof DocNode) {
					await openFilesInGroup([child.resourceUri], targetGroup);
				}
				targetGroup = vscode.ViewColumn.Beside;
			}
		}
	}

	getNodeByGitBranch(branchName: string) {
		return this.treeData.find((v) => v.branch === branchName);
	}

	// 导出口袋数据为 JSON 文件
	async exportPockets() {
		if (this.treeData.length === 0) {
			vscode.window.showInformationMessage(vscode.l10n.t("No data to export."));
			return;
		}
		const defaultName = `editor-pockets-${new Date()
			.toISOString()
			.slice(0, 10)}.json`;
		const defaultUri = vscode.workspace.workspaceFolders?.[0]
			? vscode.Uri.joinPath(
					vscode.workspace.workspaceFolders[0].uri,
					defaultName,
				)
			: vscode.Uri.file(defaultName);
		const targetUri = await vscode.window.showSaveDialog({
			defaultUri,
			filters: { JSON: ["json"] },
			saveLabel: vscode.l10n.t("Export"),
		});
		if (!targetUri) {
			return;
		}
		const payload = {
			version: 1,
			exportedAt: new Date().toISOString(),
			pockets: serializePockets(this.treeData),
		};
		try {
			const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
			await vscode.workspace.fs.writeFile(targetUri, bytes);
			vscode.window.showInformationMessage(
				vscode.l10n.t("Data exported to {0}", targetUri.fsPath),
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("Failed to export data: {0}", (error as Error).message),
			);
		}
	}

	// 从 JSON 文件导入口袋数据
	async importPockets() {
		const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
		const pickedUris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			defaultUri,
			filters: { JSON: ["json"] },
			openLabel: vscode.l10n.t("Import"),
		});
		if (!pickedUris || pickedUris.length === 0) {
			return;
		}
		let pocketsData: unknown[];
		try {
			const bytes = await vscode.workspace.fs.readFile(pickedUris[0]);
			const parsed = JSON.parse(new TextDecoder().decode(bytes));
			// 兼容两种格式：直接数组、或 { pockets: [...] }
			const raw = Array.isArray(parsed) ? parsed : parsed?.pockets;
			if (!Array.isArray(raw)) {
				throw new Error("missing pockets array");
			}
			pocketsData = raw;
		} catch (error) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("Failed to import data: {0}", (error as Error).message),
			);
			return;
		}

		let mode: "merge" | "replace" = "merge";
		if (this.treeData.length > 0) {
			const mergeLabel = vscode.l10n.t("Merge with existing data");
			const replaceLabel = vscode.l10n.t("Replace existing data");
			const choice = await vscode.window.showQuickPick(
				[
					{
						label: mergeLabel,
						description: vscode.l10n.t("Append imported data to current data"),
					},
					{
						label: replaceLabel,
						description: vscode.l10n.t("Discard current data, then import"),
					},
				],
				{ placeHolder: vscode.l10n.t("How to import?") },
			);
			if (!choice) {
				return;
			}
			mode = choice.label === replaceLabel ? "replace" : "merge";
		}

		// 合并模式下清除旧 id，让 deserializePockets 内的构造函数生成新的，避免冲突
		if (mode === "merge") {
			for (const p of pocketsData as Array<Record<string, unknown>>) {
				if (p && typeof p === "object") {
					p.id = undefined;
				}
			}
		}

		const imported = deserializePockets(pocketsData as PocketNode[]);
		if (mode === "replace") {
			this.treeData = imported;
		} else {
			this.treeData.push(...imported);
		}
		this.refresh();
		vscode.window.showInformationMessage(
			vscode.l10n.t("Data imported successfully."),
		);
	}

	getParent(element: BaseTreeNode): BaseTreeNode | undefined {
		return this._getParent(element);
	}

	private _getParent(node: BaseTreeNode): BaseTreeNode | undefined {
		for (const pocket of this.treeData) {
			if (pocket.id === node.id) {
				return undefined;
			}
			for (const child of pocket.children) {
				if (child.id === node.id) {
					return pocket;
				}
				// 仅当是 EditorGroup 时，才在其 children 中查找
				if (child instanceof EditorGroupNode) {
					for (const docNode of child.children) {
						if (docNode.id === node.id) {
							return child;
						}
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
					} else if (source instanceof DocNode) {
						// 文档直接拖到口袋下（无 group 层级）
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
