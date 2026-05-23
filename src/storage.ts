import * as vscode from "vscode";
import { DocNode, EditorGroupNode, PocketNode } from "./models/nodes";
import type { BaseTreeNode } from "./types/index";

// 反序列化：从存储格式还原为树节点
export function deserializePockets(storedData: PocketNode[]): PocketNode[] {
	return storedData.map((pocketData) => {
		const pocket = new PocketNode(pocketData.label);
		Object.assign(pocket, pocketData);
		pocket.children = (pocketData.children || []).map(
			(compartmentData: BaseTreeNode) => {
				const group = new EditorGroupNode(compartmentData.label as string);
				group.children = (compartmentData.children || []).map(
					(docStr: unknown) => {
						return new DocNode(vscode.Uri.file(docStr as string));
					},
				) as BaseTreeNode[];
				return group;
			},
		);
		return pocket;
	});
}

// 序列化：将树节点转换为可存储的格式
export function serializePockets(pockets: PocketNode[]): unknown[] {
	return pockets.map((pocket) => ({
		...pocket,
		children: (pocket.children || []).map((group: BaseTreeNode) => ({
			...group,
			children: (group.children || []).map(
				(doc: BaseTreeNode) => doc.resourceUri?.fsPath,
			),
		})),
	}));
}
