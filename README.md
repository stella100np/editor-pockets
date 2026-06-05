# Editor Pockets / 编辑器口袋

[English](./README.en.md) | 简体中文

**Editor Pockets** 是一个 VS Code 扩展，用于管理和快速恢复保存的文件组（"口袋"），帮助你快速打开和访问之前保持的特定工作区文件。

## ✨ 功能特性

- **保存文件组**：将当前打开的文件保存为"口袋"，方便后续快速访问
- **快速恢复**：一键打开保存的文件组，恢复之前的工作状态
- **Git 分支绑定**：将口袋与 Git 分支关联，切换分支时自动打开对应的文件组
- **口袋筛选**：通过视图标题栏的 🔍 按钮快速搜索筛选口袋
- **拖拽操作**：支持直接拖拽文件到口袋中进行保存和管理
- **添加文件到口袋**：通过命令面板或编辑器标题右键菜单，将当前文件快速加入到已有口袋（或分组），并自动去重
- **自动关闭控制**：可为每个口袋独立设置是否在打开时自动关闭其他编辑器
- **多国语言支持**：支持中文、英文、法文等多种语言界面

## 📦 安装

### 从 VS Code 市场安装

1. 打开 VS Code
2. 点击左侧活动栏的扩展图标（或按 `Ctrl+Shift+X`）
3. 搜索 "Editor Pockets"
4. 点击安装按钮

### 从 VSIX 文件安装

1. 下载最新的 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`，输入 "Extensions: Install from VSIX..."
3. 选择下载的 `.vsix` 文件

## 🚀 快速开始

1. 安装扩展后，在 VS Code 左侧资源管理器的上方会看到 **Editor Pockets** 视图
2. 点击视图标题中的 **+** 按钮（或使用命令面板中的 `Editor Pockets: Add Pocket` 命令）
3. 输入口袋名称，当前打开的文件将被保存到该口袋中
4. 点击口袋名称即可快速打开保存的文件组

### 使用 Git 分支绑定

1. 在口袋上右键，选择 **Link Branch**
2. 选择要绑定的 Git 分支
3. 切换到该分支时，会自动打开对应的文件组

## 📖 详细使用说明

### 命令面板命令

按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）打开命令面板，可以使用以下命令：

- `Editor Pockets: Save Tabs` - 保存当前打开的文件到新口袋
- `Editor Pockets: Add Pocket` - 创建新口袋
- `Editor Pockets: Open Pocket` - 打开口袋中的文件
- `Editor Pockets: Rename Pocket` - 重命名口袋
- `Editor Pockets: Remove Pocket` - 删除口袋
- `Editor Pockets: Filter Pockets` - 按名称搜索筛选口袋
- `Editor Pockets: Link Branch` - 将口袋与 Git 分支关联
- `Editor Pockets: Unlink Branch` - 解除口袋与分支的关联
- `Editor Pockets: Toggle Auto Close Others` - 切换是否在打开口袋时自动关闭其他编辑器
- `Editor Pockets: Add File To Pocket` - 将文件（来自资源管理器、编辑器标题菜单或当前活动编辑器）添加到指定口袋

### 右键菜单操作

在 Editor Pockets 视图中，右键点击口袋可以访问所有操作命令。

## 🔧 配置选项

扩展提供以下设置（在设置中搜索 "Editor Pockets"）：

- `editorPockets.autoCloseOthers`：打开口袋时是否自动关闭其他编辑器（默认：false，可在单个口袋上通过右键菜单单独切换）
- `editorPockets.switchToPocketOnAdd`：添加文件到口袋后，是否自动切换并在 Editor Pockets 视图中定位到该口袋（默认：true）

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/stella100np/editor-pockets.git
cd editor-pockets

# 安装依赖
pnpm install

# 编译扩展
pnpm run compile

# 启动调试
按 F5 在 VS Code 中打开新窗口进行测试
```

## 📄 许可证

本项目采用 [GPL-3.0](LICENSE) 许可证。

## 🔗 相关链接

- [GitHub 仓库](https://github.com/stella100np/editor-pockets)
- [VS Code 市场页面](https://marketplace.visualstudio.com/items?itemName=stella100np.editor-pockets)
- [问题反馈](https://github.com/stella100np/editor-pockets/issues)

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

**享受使用 Editor Pockets 提升你的工作效率！** 🎉
