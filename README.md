# Editor Pockets - Manage and Restore Open File Groups in VS Code

[中文README](README.zh-CN.md)

## Overview 🌐

Editor Pockets is a robust Visual Studio Code extension designed to help users manage their open editors efficiently. It allows for saving and restoring groups of open files, known as "pockets," along with associated tags for quick reference. This feature makes it particularly useful for those who handle multiple files and projects, needing to switch between different sets of documents seamlessly within a single VS Code window.

## Features 🚀

- 📝 **Manual Logging**: The extension allows you to manually log the opened document editors within Visual Studio Code by triggering a command from the VSCode tabs. 🛠️
- 🔃 **Sequential Restore**: Easily restore previously logged document editors in the order they were recorded. ⏭️
- 🏷️ **Tagging System**: Each restored document editor can be associated with a tag, enabling efficient categorization and management of your files. 🗂️

## Getting Started 🏁

### Installation 🛠️

1. Download the extension from the Visual Studio Code Marketplace.
2. Install the extension directly from within Visual Studio Code by navigating to the Extensions panel and searching for "editorPockets".

### Usage 📖

#### Basic Workflow
1. Create a New Pocket
2. Initiate one or more VSCode file editor windows
3. Save Current Editors

   3.1 Utilize commands on the tabs

   3.2 Save the currently open file editors into a specific pocket

4. Continue Editing and Update

   4.1 Proceed with document editing work

   4.2 When intending to update the saved file editors
   
   4.3 Use the same command button to achieve the update


#### Advanced Workflow
   - you can link a particular "pocket" to a Git branch. 
   - When switching to the specified branch from another, this plugin will automatically open the required file editors, allowing you to quickly resume your work


## API and Dependencies 🛠️

The extension leverages the following technologies:

- **[Visual Studio Code API](https://code.visualstudio.com/)**: For seamless integration with the editor and managing document editors.
- **[Esbuild](https://github.com/evanw/esbuild)**: Used for bundling the extension.
- **[TypeScript](https://www.typescriptlang.org/)**: The programming language in which the extension is developed.

## Known Issues and Limitations 🚧

- The extension currently does not support automatic logging for multiple workspace folders.
- Tags must be manually assigned during the restoration process of document editors.

## Roadmap 🗺️
- [ ] Implement support for automatic logging across multiple workspace folders.
- [ ] Drag and drop a tree item.
- [ ] Enhance the restore functionality to include saved editor layouts and states.

## Contributing 🤝

Contributions are welcome! If you have ideas for improving the extension, please open an issue or submit a pull request.

## License 📜

This project is licensed under the terms of the GNU GPL v3 license.See the [LICENSE file](LICENSE) for details.

---

For any further queries or support, feel free to reach out to the extension maintainer at [your contact information].

Happy coding with Editor Pockets!
