# Change Log

All notable changes to the "miolanguage" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4] - 2026-07-26

### Added
- 新增语言服务器，提供智能补全、悬停提示、跳转到定义、错误诊断功能
- 智能补全：关键字、类型、变量名、函数名、结构体/类成员、枚举变体、命名空间成员
- 成员补全：`.` 和 `->` 后自动提示结构体/类成员
- 命名空间补全：`::` 后自动提示命名空间成员
- 上下文补全：类型声明位置自动提示类型名
- 悬停提示：显示类型信息和符号定义
- 跳转到定义：支持变量、函数、类型跳转
- 错误诊断：实时显示语法错误
- 新增 `template`、`typename` 关键字高亮
- 新增 `class`、`namespace` 关键字高亮
- 新增 `virtual`、`override` 关键字高亮
- 新增 `public`、`private`、`protected` 访问控制关键字高亮
- 新增复合赋值运算符高亮：`+=`、`-=`、`*=`、`/=`、`%=`、`&=`、`|=`、`^=`、`<<=`、`>>=`
- 新增 `::` 作用域运算符和 `...` 变参高亮
- 新增 class、enum、union、namespace、template、extern、macro 等代码片段
- 新增 if-elif-else 代码片段
- 新增条件编译 @if/@elif/@else/@end 代码片段

### Changed
- 修正函数定义代码片段，移除不存在的 `def` 关键字，使用正确的 `返回类型 函数名()` 语法
- 主函数代码片段改为 `i32 main()`

### Removed
- 移除 `/* */` 块注释支持（Mio 语言仅支持 `#` 行注释）

## [Unreleased]

- Initial release