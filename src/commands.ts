import * as vscode from "vscode";
import type { PocketNode } from "./models/nodes";
import type { MyTreeDataProvider } from "./treeView";
import type { BaseTreeNode } from "./types/index";
import type { GitBranchManager } from "./utils/gitBranchManager";

// 添加口袋
export function addPocket(treeProvider: MyTreeDataProvider) {
	return () => treeProvider.addPocket();
}

// 保存标签页到口袋
export function saveTabs(treeProvider: MyTreeDataProvider) {
	return () => treeProvider.saveTabs2Pocket();
}

// 重命名口袋
export function renamePocket(treeProvider: MyTreeDataProvider) {
	return async (targetItem: PocketNode | undefined) => {
		const node = await treeProvider.checkNode(targetItem);
		if (node) {
			const newName = await vscode.window.showInputBox({
				value: node.label,
				placeHolder: vscode.l10n.t("Enter a new name for the pocket"),
			});
			if (newName) {
				node.label = newName;
				treeProvider.refresh();
			}
		}
	};
}

// 删除口袋或子节点
export function removePocket(treeProvider: MyTreeDataProvider) {
	return (node: BaseTreeNode) => treeProvider.remove(node);
}

// 打开口袋
export function openPocket(treeProvider: MyTreeDataProvider) {
	return (node: PocketNode) => treeProvider.openPocket(node);
}

// 关联分支
export function linkBranch(
	treeProvider: MyTreeDataProvider,
	gitBranchManager: GitBranchManager,
) {
	return async (targetItem: PocketNode | undefined) => {
		const node = await treeProvider.checkNode(targetItem);
		if (node) {
			const result = await gitBranchManager.pickUpBranch();
			if (result) {
				const { targetBranch, isAutoCloseOthers } = result;
				node.isAutoCloseOthers = isAutoCloseOthers;
				if (targetBranch) {
					const oldNode = treeProvider.getNodeByGitBranch(targetBranch);
					if (oldNode) {
						oldNode.branch = undefined;
					}
					node.branch = targetBranch;
					treeProvider.refresh();
				}
			}
		}
	};
}

// 取消关联分支
export function unlinkBranch(treeProvider: MyTreeDataProvider) {
	return async (targetItem: PocketNode | undefined) => {
		const node = await treeProvider.checkNode(targetItem);
		if (node) {
			node.branch = undefined;
			treeProvider.refresh();
		}
	};
}

// 筛选口袋
export function filterPockets(treeProvider: MyTreeDataProvider) {
	return () => treeProvider.filterPockets();
}

// 切换口袋设置（自动关闭其他编辑器）
export function togglePocketSetting(treeProvider: MyTreeDataProvider) {
	return async (targetItem: PocketNode | undefined) => {
		const node = await treeProvider.checkNode(targetItem);
		if (node) {
			node.isAutoCloseOthers = !node.isAutoCloseOthers;
			treeProvider.refresh();
		}
	};
}

// 导出口袋为 JSON
export function exportPockets(treeProvider: MyTreeDataProvider) {
	return () => treeProvider.exportPockets();
}

// 从 JSON 导入口袋
export function importPockets(treeProvider: MyTreeDataProvider) {
	return () => treeProvider.importPockets();
}
