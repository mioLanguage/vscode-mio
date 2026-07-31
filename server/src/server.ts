import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Hover,
	MarkupKind,
	Definition,
	Location,
	Position,
	Range,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser } from './parser';
import { SymbolTable, SymbolInfo } from './symbols';
import { AstNodeKind, TokenKind } from './ast';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

// Global symbol table for headers
const headerSymbols = new SymbolTable();
let cachedIncludePaths: string[] = [];

interface MioSettings {
	includePaths: string[];
}

const defaultSettings: MioSettings = { includePaths: [] };
let globalSettings: MioSettings = defaultSettings;

const documentSettings: Map<string, Thenable<MioSettings>> = new Map();

function getDocumentSettings(resource: string): Thenable<MioSettings> {
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

function loadHeaderFiles(includePaths: string[], workspaceRoot?: string): void {
	headerSymbols.symbols.clear();
	headerSymbols.types.clear();

	const resolvedPaths = includePaths.map(p => {
		if (path.isAbsolute(p)) return p;
		if (workspaceRoot) return path.join(workspaceRoot, p);
		return p;
	});

	for (const searchPath of resolvedPaths) {
		try {
			if (!fs.existsSync(searchPath)) continue;
			const files = globSync('**/*.mio', { cwd: searchPath });
			for (const file of files) {
				const filePath = path.join(searchPath, file);
				try {
					const content = fs.readFileSync(filePath, 'utf-8');
					const parser = new Parser(content);
					const ast = parser.parse();
					headerSymbols.collectFromAst(ast);
				} catch {
					// skip unreadable files
				}
			}
		} catch {
			// skip invalid paths
		}
	}
}

async function getWorkspaceRoot(): Promise<string | undefined> {
	if (hasWorkspaceFolderCapability) {
		const folders = await connection.workspace.getWorkspaceFolders();
		return folders?.[0]?.uri?.replace(/^file:\/\//, '').replace(/\//g, path.sep);
	}
	return undefined;
}

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
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
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
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
	} else {
		globalSettings = change.settings.mio || defaultSettings;
	}
	updateConfiguration();
});

connection.onDidCloseTextDocument(change => {
	documentSettings.delete(change.textDocument.uri);
});

async function updateConfiguration(): Promise<void> {
	const settings = await getDocumentSettings('/');
	const workspaceRoot = await getWorkspaceRoot();
	cachedIncludePaths = settings.includePaths || [];
	if (cachedIncludePaths.length > 0) {
		loadHeaderFiles(cachedIncludePaths, workspaceRoot);
		connection.console.log(`Loaded header files from: ${cachedIncludePaths.join(', ')}`);
	} else {
		connection.console.log('No include paths configured.');
	}
	// Re-validate all open documents
	for (const doc of documents.all()) {
		validateTextDocument(doc);
	}
}

// Keywords for completion
const KEYWORDS: CompletionItem[] = [
	{ label: 'import', kind: CompletionItemKind.Keyword, detail: '导入头文件' },
	{ label: 'extern', kind: CompletionItemKind.Keyword, detail: '外部函数声明' },
	{ label: 'var', kind: CompletionItemKind.Keyword, detail: '声明可变变量' },
	{ label: 'const', kind: CompletionItemKind.Keyword, detail: '声明常量' },
	{ label: 'macro', kind: CompletionItemKind.Keyword, detail: '定义宏' },
	{ label: 'if', kind: CompletionItemKind.Keyword, detail: 'if 条件语句' },
	{ label: 'elif', kind: CompletionItemKind.Keyword, detail: 'elif 条件分支' },
	{ label: 'else', kind: CompletionItemKind.Keyword, detail: 'else 分支' },
	{ label: 'while', kind: CompletionItemKind.Keyword, detail: 'while 循环' },
	{ label: 'for', kind: CompletionItemKind.Keyword, detail: 'for 循环' },
	{ label: 'break', kind: CompletionItemKind.Keyword, detail: '跳出循环' },
	{ label: 'continue', kind: CompletionItemKind.Keyword, detail: '继续下一次循环' },
	{ label: 'goto', kind: CompletionItemKind.Keyword, detail: '跳转到标签' },
	{ label: 'return', kind: CompletionItemKind.Keyword, detail: '返回' },
	{ label: 'enum', kind: CompletionItemKind.Keyword, detail: '定义枚举' },
	{ label: 'union', kind: CompletionItemKind.Keyword, detail: '定义联合体' },
	{ label: 'class', kind: CompletionItemKind.Keyword, detail: '定义类' },
	{ label: 'namespace', kind: CompletionItemKind.Keyword, detail: '定义命名空间' },
	{ label: 'template', kind: CompletionItemKind.Keyword, detail: '定义模板' },
	{ label: 'typename', kind: CompletionItemKind.Keyword, detail: '模板类型参数' },
	{ label: 'public', kind: CompletionItemKind.Keyword, detail: '公开访问' },
	{ label: 'private', kind: CompletionItemKind.Keyword, detail: '私有访问' },
	{ label: 'protected', kind: CompletionItemKind.Keyword, detail: '受保护访问' },
	{ label: 'virtual', kind: CompletionItemKind.Keyword, detail: '虚函数' },
	{ label: 'override', kind: CompletionItemKind.Keyword, detail: '重写虚函数' },
	{ label: 'static', kind: CompletionItemKind.Keyword, detail: '静态' },
	{ label: 'operator', kind: CompletionItemKind.Keyword, detail: '运算符重载' },
	{ label: 'true', kind: CompletionItemKind.Keyword, detail: '布尔真值' },
	{ label: 'false', kind: CompletionItemKind.Keyword, detail: '布尔假值' },
	{ label: 'this', kind: CompletionItemKind.Keyword, detail: '当前对象指针' },
];

// Type keywords for completion
const TYPES: CompletionItem[] = [
	{ label: 'i8', kind: CompletionItemKind.TypeParameter, detail: '有符号8位整数' },
	{ label: 'i16', kind: CompletionItemKind.TypeParameter, detail: '有符号16位整数' },
	{ label: 'i32', kind: CompletionItemKind.TypeParameter, detail: '有符号32位整数' },
	{ label: 'i64', kind: CompletionItemKind.TypeParameter, detail: '有符号64位整数' },
	{ label: 'i128', kind: CompletionItemKind.TypeParameter, detail: '有符号128位整数' },
	{ label: 'u8', kind: CompletionItemKind.TypeParameter, detail: '无符号8位整数' },
	{ label: 'u16', kind: CompletionItemKind.TypeParameter, detail: '无符号16位整数' },
	{ label: 'u32', kind: CompletionItemKind.TypeParameter, detail: '无符号32位整数' },
	{ label: 'u64', kind: CompletionItemKind.TypeParameter, detail: '无符号64位整数' },
	{ label: 'u128', kind: CompletionItemKind.TypeParameter, detail: '无符号128位整数' },
	{ label: 'usize', kind: CompletionItemKind.TypeParameter, detail: '指针宽度无符号整数' },
	{ label: 'isize', kind: CompletionItemKind.TypeParameter, detail: '指针宽度有符号整数' },
	{ label: 'f32', kind: CompletionItemKind.TypeParameter, detail: '32位浮点数' },
	{ label: 'f64', kind: CompletionItemKind.TypeParameter, detail: '64位浮点数' },
	{ label: 'bool', kind: CompletionItemKind.TypeParameter, detail: '布尔类型' },
	{ label: 'char', kind: CompletionItemKind.TypeParameter, detail: '字符类型' },
	{ label: 'void', kind: CompletionItemKind.TypeParameter, detail: '空类型' },
];

// Snippets for completion
const SNIPPETS: CompletionItem[] = [
	{
		label: 'if:',
		kind: CompletionItemKind.Snippet,
		detail: 'if 语句',
		insertText: 'if:${1:condition} {\n\t${2:// body}\n}',
		insertTextFormat: 2, // SnippetFormat
	},
	{
		label: 'while:',
		kind: CompletionItemKind.Snippet,
		detail: 'while 循环',
		insertText: 'while:${1:condition} {\n\t${2:// body}\n}',
		insertTextFormat: 2,
	},
	{
		label: 'for:',
		kind: CompletionItemKind.Snippet,
		detail: 'for 循环',
		insertText: 'for:${1:init}; ${2:condition}; ${3:update} {\n\t${4:// body}\n}',
		insertTextFormat: 2,
	},
	{
		label: 'var',
		kind: CompletionItemKind.Snippet,
		detail: '变量声明',
		insertText: 'var ${1:name}: ${2:type} = ${3:value};',
		insertTextFormat: 2,
	},
	{
		label: 'const',
		kind: CompletionItemKind.Snippet,
		detail: '常量声明',
		insertText: 'const ${1:NAME}: ${2:type} = ${3:value};',
		insertTextFormat: 2,
	},
	{
		label: 'class',
		kind: CompletionItemKind.Snippet,
		detail: '类定义',
		insertText: 'class ${1:Name} {\npublic:\n\t${2:field}: ${3:type};\n\n\t${1:Name}(${4:params}) {\n\t\t${5:// body}\n\t}\n}',
		insertTextFormat: 2,
	},
	{
		label: 'enum',
		kind: CompletionItemKind.Snippet,
		detail: '枚举定义',
		insertText: 'enum ${1:Name} {\n\t${2:Variant1},\n\t${3:Variant2},\n}',
		insertTextFormat: 2,
	},
	{
		label: 'namespace',
		kind: CompletionItemKind.Snippet,
		detail: '命名空间定义',
		insertText: 'namespace ${1:name} {\n\t${2:// members}\n}',
		insertTextFormat: 2,
	},
	{
		label: 'template',
		kind: CompletionItemKind.Snippet,
		detail: '模板函数',
		insertText: 'template<${1:T}:typename>\n${2:T} ${3:func}(${4:a}: ${2:T}) {\n\t${5:// body}\n}',
		insertTextFormat: 2,
	},
	{
		label: 'extern',
		kind: CompletionItemKind.Snippet,
		detail: '外部函数声明',
		insertText: 'extern ${1:void} ${2:func}(${3:params});',
		insertTextFormat: 2,
	},
	{
		label: 'main',
		kind: CompletionItemKind.Snippet,
		detail: '主函数',
		insertText: 'i32 main() {\n\t${1:// body}\n\treturn 0;\n}',
		insertTextFormat: 2,
	},
];

function parseDocument(text: string): { symbols: SymbolTable; errors: string[] } {
	const parser = new Parser(text);
	const ast = parser.parse();
	const symbols = new SymbolTable();
	symbols.collectFromAst(ast);
	return { symbols, errors: parser.getErrors() };
}

function getSymbolKind(sym: SymbolInfo): CompletionItemKind {
	switch (sym.kind) {
		case 'function':
		case 'method':
			return CompletionItemKind.Function;
		case 'variable':
			return CompletionItemKind.Variable;
		case 'constant':
			return CompletionItemKind.Constant;
		case 'class':
			return CompletionItemKind.Class;
		case 'enum':
			return CompletionItemKind.Enum;
		case 'union':
			return CompletionItemKind.Struct;
		case 'namespace':
			return CompletionItemKind.Module;
		case 'macro':
			return CompletionItemKind.Constant;
		default:
			return CompletionItemKind.Text;
	}
}

function getSymbolDetail(sym: SymbolInfo): string {
	switch (sym.kind) {
		case 'function':
		case 'method': {
			const params = sym.params?.map(p => `${p.name}: ${p.typeName || '?'}`).join(', ') || '';
			return `${sym.returnType || 'void'} ${sym.name}(${params})`;
		}
		case 'variable':
		case 'constant':
			return `${sym.kind} ${sym.name}: ${sym.typeName || '?'}`;
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	const text = textDocument.getText();
	const { errors } = parseDocument(text);

	const diagnostics: Diagnostic[] = [];
	for (const err of errors) {
		// Parse "Line X:Y: message" format
		const match = err.match(/Line (\d+):(\d+): (.+)/);
		if (match) {
			const line = parseInt(match[1]) - 1;
			const col = parseInt(match[2]) - 1;
			const msg = match[3];
			diagnostics.push({
				severity: DiagnosticSeverity.Error,
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

connection.onCompletion(
	async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
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

		// Check if we're typing an import path: import "xxx" 或 import "xxx",yyy
		const importMatch = line.match(/^import\s+("?)([\w./]*)"?/);
		if (importMatch) {
			const quote = importMatch[1];
			const currentPath = importMatch[2];
			const completions: CompletionItem[] = [];

			// Scan include paths for .mio files
			const workspaceRoot = await getWorkspaceRoot();
			const searchDirs: string[] = [];

			// Add configured include paths
			if (cachedIncludePaths.length > 0) {
				for (const p of cachedIncludePaths) {
					const resolved = path.isAbsolute(p) ? p : (workspaceRoot ? path.join(workspaceRoot, p) : p);
					if (fs.existsSync(resolved)) {
						searchDirs.push(resolved);
					}
				}
			}

			// Add common include directories
			if (workspaceRoot) {
				const commonDirs = ['include', 'lib', 'src'];
				for (const dir of commonDirs) {
					const fullDir = path.join(workspaceRoot, dir);
					if (fs.existsSync(fullDir)) {
						searchDirs.push(fullDir);
					}
				}
			}

			const seen = new Set<string>();
			for (const searchDir of searchDirs) {
				try {
					const files = globSync('**/*.mio', { cwd: searchDir });
					for (const file of files) {
						const name = file.replace(/\.mio$/, '').replace(/\\/g, '/');
						if (!seen.has(name)) {
							seen.add(name);
							completions.push({
								label: quote ? name : `"${name}"`,
								kind: CompletionItemKind.File,
								detail: `import "${name}"`,
							});
						}
					}
				} catch {
					// skip
				}
			}

			return completions;
		}

		// Check if we're after a . or -> for member completion
		const memberMatch = line.match(/(\w+)\s*(\.|->)\s*$/);
		if (memberMatch) {
			const objName = memberMatch[1];
			const typeInfo = symbols.getType(objName) || symbols.get(objName);
			if (typeInfo && (typeInfo.kind === 'struct' || typeInfo.kind === 'class' || typeInfo.kind === 'enum')) {
				const completions: CompletionItem[] = [];

				// Fields
				if (typeInfo.fields) {
					for (const field of typeInfo.fields) {
						completions.push({
							label: field.name,
							kind: CompletionItemKind.Field,
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
							kind: CompletionItemKind.Method,
							detail: `${method.returnType || 'void'} ${method.name}(${params})`,
						});
					}
				}

				// Enum variants
				if (typeInfo.variants) {
					for (const variant of typeInfo.variants) {
						completions.push({
							label: variant.name,
							kind: CompletionItemKind.EnumMember,
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
				const completions: CompletionItem[] = [];
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
				{ label: '@if', kind: CompletionItemKind.Keyword, detail: '条件编译 if' },
				{ label: '@elif', kind: CompletionItemKind.Keyword, detail: '条件编译 elif' },
				{ label: '@else', kind: CompletionItemKind.Keyword, detail: '条件编译 else' },
				{ label: '@end', kind: CompletionItemKind.Keyword, detail: '条件编译结束' },
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
		const completions: CompletionItem[] = [...KEYWORDS, ...SNIPPETS, ...TYPES];

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
	}
);

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		return item;
	}
);

connection.onHover(
	async (params: TextDocumentPositionParams): Promise<Hover | null> => {
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
		const typeItems: Record<string, string> = {
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
					kind: MarkupKind.Markdown,
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
					kind: MarkupKind.Markdown,
					value: `**\`${detail}\`**\n\n${sym.kind} defined at line ${sym.line}`,
				},
			};
		}

		return null;
	}
);

connection.onDefinition(
	async (params: TextDocumentPositionParams): Promise<Definition | null> => {
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
	}
);

documents.listen(connection);
connection.listen();