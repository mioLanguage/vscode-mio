"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const parser_1 = require("./parser");
const symbols_1 = require("./symbols");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
// Global symbol table for headers
const headerSymbols = new symbols_1.SymbolTable();
let cachedIncludePaths = [];
const defaultSettings = { includePaths: [] };
let globalSettings = defaultSettings;
const documentSettings = new Map();
function getDocumentSettings(resource) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'mio',
        });
        documentSettings.set(resource, result);
    }
    return result;
}
function loadHeaderFiles(includePaths, workspaceRoot) {
    headerSymbols.symbols.clear();
    headerSymbols.types.clear();
    const resolvedPaths = includePaths.map(p => {
        if (path.isAbsolute(p))
            return p;
        if (workspaceRoot)
            return path.join(workspaceRoot, p);
        return p;
    });
    for (const searchPath of resolvedPaths) {
        try {
            if (!fs.existsSync(searchPath))
                continue;
            const files = (0, glob_1.globSync)('**/*.mio', { cwd: searchPath });
            for (const file of files) {
                const filePath = path.join(searchPath, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const parser = new parser_1.Parser(content);
                    const ast = parser.parse();
                    headerSymbols.collectFromAst(ast);
                }
                catch {
                    // skip unreadable files
                }
            }
        }
        catch {
            // skip invalid paths
        }
    }
}
async function getWorkspaceRoot() {
    if (hasWorkspaceFolderCapability) {
        const folders = await connection.workspace.getWorkspaceFolders();
        return folders?.[0]?.uri?.replace(/^file:\/\//, '').replace(/\//g, path.sep);
    }
    return undefined;
}
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ':', '>', '@'],
            },
            hoverProvider: true,
            definitionProvider: true,
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }
    return result;
});
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(() => {
            connection.console.log('Workspace folder change event received.');
        });
    }
    // Load initial settings
    updateConfiguration();
});
connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        documentSettings.clear();
    }
    else {
        globalSettings = change.settings.mio || defaultSettings;
    }
    updateConfiguration();
});
connection.onDidCloseTextDocument(change => {
    documentSettings.delete(change.textDocument.uri);
});
async function updateConfiguration() {
    const settings = await getDocumentSettings('/');
    const workspaceRoot = await getWorkspaceRoot();
    cachedIncludePaths = settings.includePaths || [];
    if (cachedIncludePaths.length > 0) {
        loadHeaderFiles(cachedIncludePaths, workspaceRoot);
        connection.console.log(`Loaded header files from: ${cachedIncludePaths.join(', ')}`);
    }
    else {
        connection.console.log('No include paths configured.');
    }
    // Re-validate all open documents
    for (const doc of documents.all()) {
        validateTextDocument(doc);
    }
}
// Keywords for completion
const KEYWORDS = [
    { label: 'import', kind: node_1.CompletionItemKind.Keyword, detail: '导入头文件' },
    { label: 'extern', kind: node_1.CompletionItemKind.Keyword, detail: '外部函数声明' },
    { label: 'var', kind: node_1.CompletionItemKind.Keyword, detail: '声明可变变量' },
    { label: 'const', kind: node_1.CompletionItemKind.Keyword, detail: '声明常量' },
    { label: 'macro', kind: node_1.CompletionItemKind.Keyword, detail: '定义宏' },
    { label: 'if', kind: node_1.CompletionItemKind.Keyword, detail: 'if 条件语句' },
    { label: 'elif', kind: node_1.CompletionItemKind.Keyword, detail: 'elif 条件分支' },
    { label: 'else', kind: node_1.CompletionItemKind.Keyword, detail: 'else 分支' },
    { label: 'while', kind: node_1.CompletionItemKind.Keyword, detail: 'while 循环' },
    { label: 'for', kind: node_1.CompletionItemKind.Keyword, detail: 'for 循环' },
    { label: 'break', kind: node_1.CompletionItemKind.Keyword, detail: '跳出循环' },
    { label: 'continue', kind: node_1.CompletionItemKind.Keyword, detail: '继续下一次循环' },
    { label: 'goto', kind: node_1.CompletionItemKind.Keyword, detail: '跳转到标签' },
    { label: 'return', kind: node_1.CompletionItemKind.Keyword, detail: '返回' },
    { label: 'struct', kind: node_1.CompletionItemKind.Keyword, detail: '定义结构体' },
    { label: 'enum', kind: node_1.CompletionItemKind.Keyword, detail: '定义枚举' },
    { label: 'union', kind: node_1.CompletionItemKind.Keyword, detail: '定义联合体' },
    { label: 'class', kind: node_1.CompletionItemKind.Keyword, detail: '定义类' },
    { label: 'namespace', kind: node_1.CompletionItemKind.Keyword, detail: '定义命名空间' },
    { label: 'template', kind: node_1.CompletionItemKind.Keyword, detail: '定义模板' },
    { label: 'typename', kind: node_1.CompletionItemKind.Keyword, detail: '模板类型参数' },
    { label: 'public', kind: node_1.CompletionItemKind.Keyword, detail: '公开访问' },
    { label: 'private', kind: node_1.CompletionItemKind.Keyword, detail: '私有访问' },
    { label: 'protected', kind: node_1.CompletionItemKind.Keyword, detail: '受保护访问' },
    { label: 'virtual', kind: node_1.CompletionItemKind.Keyword, detail: '虚函数' },
    { label: 'override', kind: node_1.CompletionItemKind.Keyword, detail: '重写虚函数' },
    { label: 'static', kind: node_1.CompletionItemKind.Keyword, detail: '静态' },
    { label: 'operator', kind: node_1.CompletionItemKind.Keyword, detail: '运算符重载' },
    { label: 'true', kind: node_1.CompletionItemKind.Keyword, detail: '布尔真值' },
    { label: 'false', kind: node_1.CompletionItemKind.Keyword, detail: '布尔假值' },
    { label: 'this', kind: node_1.CompletionItemKind.Keyword, detail: '当前对象指针' },
];
// Type keywords for completion
const TYPES = [
    { label: 'i8', kind: node_1.CompletionItemKind.TypeParameter, detail: '有符号8位整数' },
    { label: 'i16', kind: node_1.CompletionItemKind.TypeParameter, detail: '有符号16位整数' },
    { label: 'i32', kind: node_1.CompletionItemKind.TypeParameter, detail: '有符号32位整数' },
    { label: 'i64', kind: node_1.CompletionItemKind.TypeParameter, detail: '有符号64位整数' },
    { label: 'i128', kind: node_1.CompletionItemKind.TypeParameter, detail: '有符号128位整数' },
    { label: 'u8', kind: node_1.CompletionItemKind.TypeParameter, detail: '无符号8位整数' },
    { label: 'u16', kind: node_1.CompletionItemKind.TypeParameter, detail: '无符号16位整数' },
    { label: 'u32', kind: node_1.CompletionItemKind.TypeParameter, detail: '无符号32位整数' },
    { label: 'u64', kind: node_1.CompletionItemKind.TypeParameter, detail: '无符号64位整数' },
    { label: 'u128', kind: node_1.CompletionItemKind.TypeParameter, detail: '无符号128位整数' },
    { label: 'usize', kind: node_1.CompletionItemKind.TypeParameter, detail: '指针宽度无符号整数' },
    { label: 'isize', kind: node_1.CompletionItemKind.TypeParameter, detail: '指针宽度有符号整数' },
    { label: 'f32', kind: node_1.CompletionItemKind.TypeParameter, detail: '32位浮点数' },
    { label: 'f64', kind: node_1.CompletionItemKind.TypeParameter, detail: '64位浮点数' },
    { label: 'bool', kind: node_1.CompletionItemKind.TypeParameter, detail: '布尔类型' },
    { label: 'char', kind: node_1.CompletionItemKind.TypeParameter, detail: '字符类型' },
    { label: 'void', kind: node_1.CompletionItemKind.TypeParameter, detail: '空类型' },
];
// Snippets for completion
const SNIPPETS = [
    {
        label: 'if:',
        kind: node_1.CompletionItemKind.Snippet,
        detail: 'if 语句',
        insertText: 'if:${1:condition} {\n\t${2:// body}\n}',
        insertTextFormat: 2, // SnippetFormat
    },
    {
        label: 'while:',
        kind: node_1.CompletionItemKind.Snippet,
        detail: 'while 循环',
        insertText: 'while:${1:condition} {\n\t${2:// body}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'for:',
        kind: node_1.CompletionItemKind.Snippet,
        detail: 'for 循环',
        insertText: 'for:${1:init}; ${2:condition}; ${3:update} {\n\t${4:// body}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'var',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '变量声明',
        insertText: 'var ${1:name}: ${2:type} = ${3:value};',
        insertTextFormat: 2,
    },
    {
        label: 'const',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '常量声明',
        insertText: 'const ${1:NAME}: ${2:type} = ${3:value};',
        insertTextFormat: 2,
    },
    {
        label: 'struct',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '结构体定义',
        insertText: 'struct ${1:Name} {\n\t${2:field}: ${3:type};\n\n\t${1:Name}(${4:params}) {\n\t\t${5:// body}\n\t}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'class',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '类定义',
        insertText: 'class ${1:Name} {\npublic:\n\t${2:field}: ${3:type};\n\n\t${1:Name}(${4:params}) {\n\t\t${5:// body}\n\t}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'enum',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '枚举定义',
        insertText: 'enum ${1:Name} {\n\t${2:Variant1},\n\t${3:Variant2},\n}',
        insertTextFormat: 2,
    },
    {
        label: 'namespace',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '命名空间定义',
        insertText: 'namespace ${1:name} {\n\t${2:// members}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'template',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '模板函数',
        insertText: 'template<${1:T}:typename>\n${2:T} ${3:func}(${4:a}: ${2:T}) {\n\t${5:// body}\n}',
        insertTextFormat: 2,
    },
    {
        label: 'extern',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '外部函数声明',
        insertText: 'extern ${1:void} ${2:func}(${3:params});',
        insertTextFormat: 2,
    },
    {
        label: 'main',
        kind: node_1.CompletionItemKind.Snippet,
        detail: '主函数',
        insertText: 'i32 main() {\n\t${1:// body}\n\treturn 0;\n}',
        insertTextFormat: 2,
    },
];
function parseDocument(text) {
    const parser = new parser_1.Parser(text);
    const ast = parser.parse();
    const symbols = new symbols_1.SymbolTable();
    symbols.collectFromAst(ast);
    return { symbols, errors: parser.getErrors() };
}
function getSymbolKind(sym) {
    switch (sym.kind) {
        case 'function':
        case 'method':
            return node_1.CompletionItemKind.Function;
        case 'variable':
            return node_1.CompletionItemKind.Variable;
        case 'constant':
            return node_1.CompletionItemKind.Constant;
        case 'struct':
            return node_1.CompletionItemKind.Struct;
        case 'class':
            return node_1.CompletionItemKind.Class;
        case 'enum':
            return node_1.CompletionItemKind.Enum;
        case 'union':
            return node_1.CompletionItemKind.Struct;
        case 'namespace':
            return node_1.CompletionItemKind.Module;
        case 'macro':
            return node_1.CompletionItemKind.Constant;
        default:
            return node_1.CompletionItemKind.Text;
    }
}
function getSymbolDetail(sym) {
    switch (sym.kind) {
        case 'function':
        case 'method': {
            const params = sym.params?.map(p => `${p.name}: ${p.typeName || '?'}`).join(', ') || '';
            return `${sym.returnType || 'void'} ${sym.name}(${params})`;
        }
        case 'variable':
        case 'constant':
            return `${sym.kind} ${sym.name}: ${sym.typeName || '?'}`;
        case 'struct':
            return `struct ${sym.name}`;
        case 'class':
            return `class ${sym.name}`;
        case 'enum':
            return `enum ${sym.name}`;
        case 'union':
            return `union ${sym.name}`;
        case 'namespace':
            return `namespace ${sym.name}`;
        case 'macro':
            return `macro ${sym.name}`;
        default:
            return sym.name;
    }
}
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});
async function validateTextDocument(textDocument) {
    const text = textDocument.getText();
    const { errors } = parseDocument(text);
    const diagnostics = [];
    for (const err of errors) {
        // Parse "Line X:Y: message" format
        const match = err.match(/Line (\d+):(\d+): (.+)/);
        if (match) {
            const line = parseInt(match[1]) - 1;
            const col = parseInt(match[2]) - 1;
            const msg = match[3];
            diagnostics.push({
                severity: node_1.DiagnosticSeverity.Error,
                range: {
                    start: { line, character: col },
                    end: { line, character: col + 1 },
                },
                message: msg,
                source: 'mio',
            });
        }
    }
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
connection.onDidChangeWatchedFiles(() => {
    // Monitored files have changed
});
connection.onCompletion(async (textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return [];
    }
    const text = document.getText();
    const { symbols } = parseDocument(text);
    const position = textDocumentPosition.position;
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character },
    });
    // Check if we're after a . or -> for member completion
    const memberMatch = line.match(/(\w+)\s*(\.|->)\s*$/);
    if (memberMatch) {
        const objName = memberMatch[1];
        const typeInfo = symbols.getType(objName) || symbols.get(objName);
        if (typeInfo && (typeInfo.kind === 'struct' || typeInfo.kind === 'class' || typeInfo.kind === 'enum')) {
            const completions = [];
            // Fields
            if (typeInfo.fields) {
                for (const field of typeInfo.fields) {
                    completions.push({
                        label: field.name,
                        kind: node_1.CompletionItemKind.Field,
                        detail: `field: ${field.typeName}`,
                    });
                }
            }
            // Methods
            if (typeInfo.methods) {
                for (const method of typeInfo.methods) {
                    const params = method.params?.map(p => `${p.name}: ${p.typeName || '?'}`).join(', ') || '';
                    completions.push({
                        label: method.name,
                        kind: node_1.CompletionItemKind.Method,
                        detail: `${method.returnType || 'void'} ${method.name}(${params})`,
                    });
                }
            }
            // Enum variants
            if (typeInfo.variants) {
                for (const variant of typeInfo.variants) {
                    completions.push({
                        label: variant.name,
                        kind: node_1.CompletionItemKind.EnumMember,
                        detail: `${typeInfo.name}.${variant.name}`,
                    });
                }
            }
            return completions;
        }
    }
    // Check if we're after :: for namespace completion
    const nsMatch = line.match(/(\w+)\s*::\s*$/);
    if (nsMatch) {
        const nsName = nsMatch[1];
        const ns = symbols.getNamespace(nsName);
        if (ns) {
            const completions = [];
            for (const sym of ns.getAllSymbols()) {
                completions.push({
                    label: sym.name,
                    kind: getSymbolKind(sym),
                    detail: getSymbolDetail(sym),
                });
            }
            return completions;
        }
    }
    // Check if we're after @ for conditional compilation
    if (line.endsWith('@')) {
        return [
            { label: '@if', kind: node_1.CompletionItemKind.Keyword, detail: '条件编译 if' },
            { label: '@elif', kind: node_1.CompletionItemKind.Keyword, detail: '条件编译 elif' },
            { label: '@else', kind: node_1.CompletionItemKind.Keyword, detail: '条件编译 else' },
            { label: '@end', kind: node_1.CompletionItemKind.Keyword, detail: '条件编译结束' },
        ];
    }
    // Check if we're after a type context (after : or var/const)
    const typeContext = line.match(/(:\s*|var\s+\w+\s*:\s*|const\s+\w+\s*:\s*|extern\s+)$/);
    if (typeContext) {
        const completions = [...TYPES];
        // Add user-defined types
        for (const sym of symbols.getAllTypes()) {
            completions.push({
                label: sym.name,
                kind: getSymbolKind(sym),
                detail: getSymbolDetail(sym),
            });
        }
        return completions;
    }
    // Default: keywords + types + symbols
    const completions = [...KEYWORDS, ...SNIPPETS, ...TYPES];
    // Add symbols from header files
    for (const sym of headerSymbols.getAllSymbols()) {
        completions.push({
            label: sym.name,
            kind: getSymbolKind(sym),
            detail: getSymbolDetail(sym),
        });
    }
    // Add types from header files
    for (const sym of headerSymbols.getAllTypes()) {
        if (!completions.find(c => c.label === sym.name)) {
            completions.push({
                label: sym.name,
                kind: getSymbolKind(sym),
                detail: getSymbolDetail(sym),
            });
        }
    }
    // Add symbols from the current file
    for (const sym of symbols.getAllSymbols()) {
        completions.push({
            label: sym.name,
            kind: getSymbolKind(sym),
            detail: getSymbolDetail(sym),
        });
    }
    // Add types
    for (const sym of symbols.getAllTypes()) {
        // Avoid duplicates
        if (!completions.find(c => c.label === sym.name)) {
            completions.push({
                label: sym.name,
                kind: getSymbolKind(sym),
                detail: getSymbolDetail(sym),
            });
        }
    }
    return completions;
});
connection.onCompletionResolve((item) => {
    return item;
});
connection.onHover(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    const text = document.getText();
    const { symbols } = parseDocument(text);
    const position = params.position;
    const range = {
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character },
    };
    const line = document.getText(range);
    // Try to find the word at the cursor position
    const wordMatch = line.match(/(\w+)\s*$/);
    if (!wordMatch) {
        return null;
    }
    const word = wordMatch[1];
    // Check if it's a type keyword
    const typeItems = {
        'i8': '有符号 8 位整数 (-128 ~ 127)',
        'i16': '有符号 16 位整数 (-32768 ~ 32767)',
        'i32': '有符号 32 位整数',
        'i64': '有符号 64 位整数',
        'i128': '有符号 128 位整数',
        'u8': '无符号 8 位整数 (0 ~ 255)',
        'u16': '无符号 16 位整数 (0 ~ 65535)',
        'u32': '无符号 32 位整数',
        'u64': '无符号 64 位整数',
        'u128': '无符号 128 位整数',
        'usize': '指针宽度无符号整数',
        'isize': '指针宽度有符号整数',
        'f32': '32 位浮点数',
        'f64': '64 位浮点数',
        'bool': '布尔类型 (true / false)',
        'char': '单个字符',
        'void': '空类型（无返回值）',
    };
    if (typeItems[word]) {
        return {
            contents: {
                kind: node_1.MarkupKind.Markdown,
                value: `**\`${word}\`** — ${typeItems[word]}`,
            },
        };
    }
    // Check symbols
    let sym = symbols.get(word) || symbols.getType(word);
    if (!sym) {
        sym = headerSymbols.get(word) || headerSymbols.getType(word);
    }
    if (sym) {
        const detail = getSymbolDetail(sym);
        return {
            contents: {
                kind: node_1.MarkupKind.Markdown,
                value: `**\`${detail}\`**\n\n${sym.kind} defined at line ${sym.line}`,
            },
        };
    }
    return null;
});
connection.onDefinition(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    const text = document.getText();
    const { symbols } = parseDocument(text);
    const position = params.position;
    const range = {
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character },
    };
    const line = document.getText(range);
    const wordMatch = line.match(/(\w+)\s*$/);
    if (!wordMatch) {
        return null;
    }
    const word = wordMatch[1];
    let sym = symbols.get(word) || symbols.getType(word);
    if (sym) {
        return {
            uri: params.textDocument.uri,
            range: {
                start: { line: sym.line - 1, character: sym.col - 1 },
                end: { line: sym.line - 1, character: sym.col + sym.name.length - 1 },
            },
        };
    }
    // Check header symbols
    const headerSym = headerSymbols.get(word) || headerSymbols.getType(word);
    if (headerSym) {
        return {
            uri: params.textDocument.uri,
            range: {
                start: { line: headerSym.line - 1, character: headerSym.col - 1 },
                end: { line: headerSym.line - 1, character: headerSym.col + headerSym.name.length - 1 },
            },
        };
    }
    return null;
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map