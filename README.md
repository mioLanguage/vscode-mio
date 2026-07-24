# Mio Language Support

为 [Mio 编程语言](https://github.com/mioLanguage/mio) 提供的 VS Code 插件。  
提供语法高亮、代码片段、符号识别等基础编辑支持。

## 前置要求

**在使用本插件前，请先安装 Mio 编译器 `mioc`。**

- 下载地址：[mioLanguage/mio · Releases](https://github.com/mioLanguage/mio/releases)
- 选择对应你操作系统的版本（如 `mioc-windows-x64.exe`、`mioc-linux-x64`、`mioc-macos-x64`）
- 将下载的 `mioc` 放在任意目录，并**确保该目录已添加到系统 PATH 环境变量中**

验证是否安装成功：
```bash
mioc --version
```

## 插件功能

本插件只提供 **编辑器内支持**，不包含编译器：

- 语法高亮（关键字、类型、注释、字符串等）
- 代码片段（`def`、`if`、`while`、`struct` 等）
- 括号匹配与自动补全
- 基于文件扩展名 `.mio` 自动识别语言

## 如何在 VS Code 中运行 Mio 代码

插件本身不负责运行代码。推荐配合 **Code Runner** 扩展实现一键运行。

### 1. 安装 Code Runner

在 VS Code 扩展市场搜索 `Code Runner` 并安装。

### 2. 配置 Code Runner

在 VS Code 的 `settings.json` 中添加以下配置：

```json
{
    "code-runner.executorMap": {
        "mio": "mioc $fullFileName -o $fileNameWithoutExt && ./$fileNameWithoutExt"
    }
}
```

### 3. 使用

- 打开任意 `.mio` 文件
- 按 `Ctrl+Alt+N`（Windows/Linux）或 `Cmd+Alt+N`（macOS）即可编译并运行

## 语法示例

```mio
import stdio.h;

def void main() {
    var x: i32 = 10;
    printf("Hello, Mio!\n");
    printf("x = %d\n", x);
}
```

## 常见问题

**Q: 语法高亮不生效？**  
A: 检查右下角语言模式是否为 `Mio`，如果不是，手动选择 `Mio`。

**Q: 代码片段不触发？**  
A: 输入 `def` 后按 `Tab` 键。如果无效，按 `Ctrl+Space` 手动触发补全。

**Q: 运行代码时提示 `mioc: command not found`**  
A: 说明 `mioc` 不在 PATH 中。请将其所在目录添加到系统环境变量，或使用绝对路径配置 Code Runner。

## 贡献
- [HZY1618yzh](https://github.com/HZY1618yzh)

## 许可证

MIT License

Copyright (c) 2026 mioLanguage

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.