import * as vscode from "vscode";
import type { GitExtension } from "./types/git.d.ts"; // 如果 types/git 是一个类型定义文件
import { nanoid } from "nanoid";
import { relative, basename, dirname } from "node:path";
// 或者
// contextValue枚举
enum ContextValue {
	POCKET = "pocket",
	COMPARTMENT = "compartment",
	DOCUMENT = "document",
}
const WORKSPACESTATE_KEY = "editorpocketstorage";

export interface BaseTreeNode extends vscode.TreeItem {
	children: BaseTreeNode[];
}

export class PocketNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	public isAutoCloseOthers = false;
	public branch: string | undefined;
	constructor(public label: string) {
		super(label);
		this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		this.contextValue = ContextValue.POCKET;
	}
}

class CompartmentNode extends vscode.TreeItem implements BaseTreeNode {
	public children: BaseTreeNode[] = [];
	constructor(public label: string) {
		super(label);
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = ContextValue.COMPARTMENT;
	}
}

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

/**
 * 创建一个 TreeItem 并设置其 description 为给定 URI 所在文件夹的相对路径。
 * @param uri - 文件的 URI。
 * @returns {vscode.TreeItem} - 设置了文件夹相对路径作为 description 的 TreeItem。
 */
function createTreeItemWithRelativePath(uri: vscode.Uri): vscode.TreeItem {
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

	// 创建 TreeItem 并设置 label 和 description
	const treeItem = new vscode.TreeItem(uri);
	treeItem.description =
		folderRelativePath === "." ? undefined : folderRelativePath;

	return treeItem;
}
export function getRepo() {
	const gitExtension =
		vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
	const git = gitExtension?.getAPI(1);
	if (Array.isArray(vscode.workspace.workspaceFolders) && git) {
		return git.getRepository(vscode.workspace.workspaceFolders[0].uri);
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
		vscode.window.createTreeView("EditorPockets", {
			treeDataProvider: this,
			showCollapseAll: true,
		});
		this._workspaceState = ctx.workspaceState;
		this._workspaceState.update(WORKSPACESTATE_KEY, []);
		// 从工作区状态中读取数据，并进行反序列化
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
				children: (compartment.children || []).map((doc) =>
					JSON.stringify(doc),
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
						const doc = JSON.parse(docStr);
						const docNode = new vscode.TreeItem(
							vscode.Uri.file(doc.resourceUri.fsPath),
						);
						docNode.id = nanoid();
						return docNode;
					},
				) as BaseTreeNode[];
				return compartment;
			});
			return pocket;
		});
	}

	async addEntry() {
		const value = await vscode.window.showInputBox({
			placeHolder: vscode.l10n.t("Enter your pocket`s name"),
		});
		if (value) {
			const item = new PocketNode(value);
			item.id = nanoid();
			this.treeData.push(item);
			this.refresh();
		}
		return value;
	}

	async beforeAddTabs() {
		if (this.treeData.length) {
			const nodes = this.treeData.map((v) => v.label).filter((v) => v);
			const node = await vscode.window.showQuickPick(nodes, {
				placeHolder: vscode.l10n.t("Choose a pocket"),
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
			vscode.window.showErrorMessage(
				vscode.l10n.t("No editor is currently active!"),
			);
			return;
		}

		// biome-ignore lint/style/useConst: <explanation>
		let targetItem = this.treeData.find((item) => {
			return item.label === msg;
		});
		if (targetItem) {
			const result = [];
			const allTabs = vscode.window.tabGroups.all;
			for (let i = 0; i < allTabs.length; i++) {
				const splitedList = allTabs[i];
				const compartment = new CompartmentNode(
					vscode.l10n.t("Group {0}", splitedList.viewColumn),
				);
				compartment.id = nanoid();

				for (let j = 0; j < splitedList.tabs.length; j++) {
					const tab = splitedList.tabs[j];
					if (tab.input instanceof vscode.TabInputText) {
						console.log(tab.input.uri);
						const docNode = createTreeItemWithRelativePath(
							tab.input.uri,
						) as BaseTreeNode;
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
	async openPocket(targetItem: PocketNode) {
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
				compartmentNode.children.map((v) => v.resourceUri),
				targetGroup,
			);
			targetGroup = vscode.ViewColumn.Beside;
		}
	}
	renamePocket(targetItem: PocketNode) {
		vscode.window
			.showInputBox({
				value: targetItem.label,
				placeHolder: vscode.l10n.t("Enter a new name for the pocket"),
			})
			.then((newName) => {
				if (newName) {
					targetItem.label = newName;
					this.refresh();
				}
			});
	}
	async linkGitBranch(node: PocketNode, branchesMap: Map<string, PocketNode>) {
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
				placeHolder: vscode.l10n.t("Choose a branch to link"),
			});
			const options = [
				{ label: `$(check)${vscode.l10n.t("yes")}`, value: true },
				{ label: `$(chrome-close)${vscode.l10n.t("no")}`, value: false },
			];
			// 是否自动关闭其他编辑器
			const selectedOption = await vscode.window.showQuickPick(options, {
				placeHolder: vscode.l10n.t(
					"Will switching to this branch automatically close the other file editors?",
				),
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
