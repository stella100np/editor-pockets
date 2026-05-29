import * as vscode from "vscode";
import { DocNode, EditorGroupNode, PocketNode } from "./models/nodes";
import { type BaseTreeNode, ContextValue } from "./types/index";

// 反序列化：从存储格式还原为树节点
export function deserializePockets(storedData: PocketNode[]): PocketNode[] {
	return storedData.map((pocketData) => {
		const pocket = new PocketNode(pocketData.label);
		Object.assign(pocket, pocketData);
		pocket.children = (pocketData.children || []).map((childData: unknown) => {
			// 字符串表示直接放在口袋下的文档节点
			if (typeof childData === "string") {
				return new DocNode(vscode.Uri.file(childData));
			}
			// 对象表示为 EditorGroup 节点（向后兼容旧格式）
			const groupData = childData as BaseTreeNode;
			const group = new EditorGroupNode(groupData.label as string);
			group.children = (groupData.children || []).map(
				(docStr: unknown) => new DocNode(vscode.Uri.file(docStr as string)),
			) as BaseTreeNode[];
			return group;
		});
		return pocket;
	});
}

// 序列化：将树节点转换为可存储的格式
export function serializePockets(pockets: PocketNode[]): unknown[] {
	return pockets.map((pocket) => ({
		...pocket,
		children: (pocket.children || []).map((child: BaseTreeNode) => {
			if (child.contextValue === ContextValue.EDITOR_GROUP) {
				return {
					...child,
					children: (child.children || []).map(
						(doc: BaseTreeNode) => doc.resourceUri?.fsPath,
					),
				};
			}
			// 直接文档节点，只存路径字符串
			return child.resourceUri?.fsPath;
		}),
	}));
}
