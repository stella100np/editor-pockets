import * as vscode from "vscode";

// 打开文件到指定的编辑器组
export async function openFilesInGroup(
	resourceUris: (vscode.Uri | boolean | undefined)[],
	group: vscode.ViewColumn | undefined,
) {
	for (const resourceUri of resourceUris) {
		if (resourceUri instanceof vscode.Uri) {
			try {
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
