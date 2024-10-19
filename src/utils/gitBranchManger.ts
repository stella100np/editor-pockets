import * as vscode from "vscode";
import type { MyTreeDataProvider } from "../editorPockets";

import type { GitExtension, Repository } from "../types/git.d.ts"; // 如果 types/git 是一个类型定义文件
export class GitBranchManager {
	private _repo: Repository | undefined;
	private treeProvider: MyTreeDataProvider;

	constructor(treeProvider: MyTreeDataProvider) {
		this.treeProvider = treeProvider;

		const gitExtension =
			vscode.extensions.getExtension<GitExtension>("vscode.git");
		if (gitExtension) {
			// 如果 Git 扩展已经激活，则直接初始化
			if (gitExtension.isActive) {
				this.initializeBranchListener();
			} else {
				// 否则，在 Git 扩展激活后再初始化
				gitExtension.activate().then(() => {
					const gitAPI = gitExtension.exports.getAPI(1);
					gitAPI.onDidOpenRepository(() => {
						this._repo = gitAPI.repositories[0];
						this.initializeBranchListener();
					});
				});
			}
		} else {
			// 处理 Git 扩展未安装的情况
			vscode.window.showErrorMessage(
				"Git extension is not installed. Please install it to use this feature.",
			);
		}
	}

	private initializeBranchListener() {
		if (this._repo) {
			let currentBranch = this._repo.state.HEAD?.name;
			this._repo.state.onDidChange(() => {
				const newBranch = this._repo?.state.HEAD?.name;
				if (newBranch && newBranch !== currentBranch) {
					currentBranch = newBranch;
					const node = this.treeProvider.getNodeByGitBranch(newBranch);
					if (node) {
						this.treeProvider.openPocket(node);
					}
				}
			});
		}
	}

	async pickUpBranch() {
		if (this._repo) {
			const branches = await this._repo.getBranches({ remote: true });
			const branchOptions = branches
				.filter((v) => v.name !== undefined)
				.map((v) => ({
					label: `$(git-branch)${v.name}`,
					value: v.name,
					description: v.commit,
				}));

			const targetBranch = await vscode.window.showQuickPick(branchOptions, {
				placeHolder: vscode.l10n.t("Choose a branch to link"),
			});

			const selectedOption = await vscode.window.showQuickPick(
				[
					{ label: `$(chrome-close)${vscode.l10n.t("no")}`, value: false },
					{ label: `$(check)${vscode.l10n.t("yes")}`, value: true },
				],
				{
					placeHolder: vscode.l10n.t(
						"Will switching to this branch automatically close the other file editors?",
					),
				},
			);
			return {
				targetBranch: targetBranch?.value,
				isAutoCloseOthers: selectedOption?.value || false,
			};
		}
	}
}
