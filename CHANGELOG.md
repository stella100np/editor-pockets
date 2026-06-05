# Change Log

All notable changes to the "editor-pockets" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.3.0] - 2026-06-05

### Added

- 新增 **添加文件到口袋** 命令（`editor-pockets.addFileToPocket`）：可通过命令面板或编辑器标题右键菜单将文件 URI 或当前活动编辑器的文件添加到指定口袋（或其分组）。添加完成后会自动展开并定位到对应口袋节点。
- 新增配置项 `editorPockets.switchToPocketOnAdd`（默认开启）：控制添加文件到口袋后是否自动切换/聚焦到 Editor Pockets 视图，原有固定切换逻辑被该配置接管。

### Fixed

- 修复向口袋或分组添加文档节点时可能出现重复条目的问题：新增重复检测逻辑（`isDuplicate`），相同资源路径的文档节点不会再被重复添加，保持口袋节点结构唯一。

## Earlier

- Initial release