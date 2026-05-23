# Editor Pockets

[中文](./README.md) | English

**Editor Pockets** is a VS Code extension for managing and quickly restoring saved file groups ("pockets"), helping you rapidly open and access previously maintained workspace files.

## ✨ Features

- **Save File Groups**: Save currently open files as "pockets" for quick access later
- **Quick Restore**: One-click opening of saved file groups to restore previous work states
- **Git Branch Binding**: Associate pockets with Git branches to automatically open corresponding file groups when switching branches
- **Pocket Filtering**: Quickly search and filter pockets using the 🔍 button in the view title bar
- **Drag & Drop**: Support dragging files directly into pockets for saving and management
- **Auto-Close Control**: Individually toggle whether to auto-close other editors per-pocket via context menu
- **Multi-language Support**: Interface available in Chinese, English, French and more

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Click the Extensions icon in the Activity Bar (or press `Ctrl+Shift+X`)
3. Search for "Editor Pockets"
4. Click the Install button

### From VSIX File

1. Download the latest `.vsix` file
2. In VS Code, press `Ctrl+Shift+P`, type "Extensions: Install from VSIX..."
3. Select the downloaded `.vsix` file

## 🚀 Quick Start

1. After installing the extension, you'll see the **Editor Pockets** view in the upper part of VS Code's Explorer sidebar
2. Click the **+** button in the view title (or use the `Editor Pockets: Add Pocket` command from the command palette)
3. Enter a pocket name, and the currently open files will be saved to that pocket
4. Click the pocket name to quickly open the saved file group

### Git Branch Binding

1. Right-click on a pocket and select **Link Branch**
2. Choose the Git branch to bind
3. When switching to that branch, the corresponding file group will open automatically

## 📖 Detailed Usage

### Command Palette Commands

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the command palette and access these commands:

- `Editor Pockets: Save Tabs` - Save current open files to a new pocket
- `Editor Pockets: Add Pocket` - Create a new pocket
- `Editor Pockets: Open Pocket` - Open files in a pocket
- `Editor Pockets: Rename Pocket` - Rename a pocket
- `Editor Pockets: Remove Pocket` - Delete a pocket
- `Editor Pockets: Filter Pockets` - Search and filter pockets by name
- `Editor Pockets: Link Branch` - Associate a pocket with a Git branch
- `Editor Pockets: Unlink Branch` - Remove branch association from a pocket
- `Editor Pockets: Toggle Auto Close Others` - Toggle whether to automatically close other editors when opening a pocket

### Context Menu Operations

Right-click on a pocket in the Editor Pockets view to access all operation commands.

## 🔧 Configuration

The extension provides the following settings (search "Editor Pockets" in settings):

- `editorPockets.autoCloseOthers`: Whether to automatically close other editors when opening a pocket (default: false, can be toggled per-pocket via right-click context menu)

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/stella100np/editor-pockets.git
cd editor-pockets

# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Start debugging
Press F5 to open a new VS Code window for testing
```

## 📄 License

This project is licensed under the [GPL-3.0](LICENSE) license.

## 🔗 Links

- [GitHub Repository](https://github.com/stella100np/editor-pockets)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=stella100np.editor-pockets)
- [Report Issues](https://github.com/stella100np/editor-pockets/issues)

## 🙏 Acknowledgments

Thanks to all developers who have contributed to this project!

---

**Enjoy using Editor Pockets to boost your productivity!** 🎉
