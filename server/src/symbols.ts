import { AstNode, AstNodeKind, Param, Field, Variant } from './ast';

export interface SymbolInfo {
	name: string;
	kind: string;
	typeName?: string;
	returnType?: string;
	params?: Param[];
	fields?: Field[];
	methods?: SymbolInfo[];
	variants?: Variant[];
	baseName?: string;
	parentName?: string;
	line: number;
	col: number;
}

export class SymbolTable {
	symbols: Map<string, SymbolInfo> = new Map();
	types: Map<string, SymbolInfo> = new Map();
	namespaces: Map<string, SymbolTable> = new Map();
	private parent?: SymbolTable;

	constructor(parent?: SymbolTable) {
		this.parent = parent;
	}

	add(name: string, info: SymbolInfo): void {
		this.symbols.set(name, info);
	}

	addType(name: string, info: SymbolInfo): void {
		this.types.set(name, info);
	}

	get(name: string): SymbolInfo | undefined {
		return this.symbols.get(name) || this.parent?.get(name);
	}

	getType(name: string): SymbolInfo | undefined {
		return this.types.get(name) || this.parent?.getType(name);
	}

	getAllSymbols(): SymbolInfo[] {
		const result: SymbolInfo[] = [];
		for (const [, sym] of this.symbols) {
			result.push(sym);
		}
		return result;
	}

	getAllTypes(): SymbolInfo[] {
		const result: SymbolInfo[] = [];
		for (const [, sym] of this.types) {
			result.push(sym);
		}
		return result;
	}

	collectFromAst(ast: AstNode, currentNamespace?: string): void {
		for (const decl of ast.decls) {
			this.collectDecl(decl, currentNamespace);
		}
	}

	private collectDecl(decl: AstNode, currentNamespace?: string): void {
		switch (decl.kind) {
			case AstNodeKind.FUNC_DEF:
				this.collectFunction(decl, currentNamespace);
				break;
			case AstNodeKind.VAR_DECL:
				this.collectVariable(decl, currentNamespace);
				break;
			case AstNodeKind.CONST_DECL:
				this.collectConstant(decl, currentNamespace);
				break;
			case AstNodeKind.ENUM_DEF:
				this.collectEnum(decl, currentNamespace);
				break;
			case AstNodeKind.UNION_DEF:
				this.collectUnion(decl, currentNamespace);
				break;
			case AstNodeKind.CLASS_DEF:
				this.collectClass(decl, currentNamespace);
				break;
			case AstNodeKind.NAMESPACE_DEF:
				this.collectNamespace(decl);
				break;
			case AstNodeKind.NAMESPACE_IMPORT:
				// Namespace imports are not collected for completion
				break;
			case AstNodeKind.TEMPLATE_DEF:
				this.collectTemplate(decl, currentNamespace);
				break;
			case AstNodeKind.IMPORT:
				// Imports are not collected for completion
				break;
			default:
				break;
		}
	}

	private collectFunction(decl: AstNode, currentNamespace?: string): void {
		if (!decl.funcName) { return; }
		const name = decl.funcName;
		const info: SymbolInfo = {
			name,
			kind: 'function',
			returnType: decl.returnType,
			params: decl.params,
			line: decl.line,
			col: decl.col,
		};
		this.add(name, info);
	}

	private collectVariable(decl: AstNode, currentNamespace?: string): void {
		if (!decl.varName) { return; }
		this.add(decl.varName, {
			name: decl.varName,
			kind: 'variable',
			typeName: decl.varType,
			line: decl.line,
			col: decl.col,
		});
	}

	private collectConstant(decl: AstNode, currentNamespace?: string): void {
		if (!decl.varName) { return; }
		this.add(decl.varName, {
			name: decl.varName,
			kind: 'constant',
			typeName: decl.varType,
			line: decl.line,
			col: decl.col,
		});
	}

	private collectEnum(decl: AstNode, currentNamespace?: string): void {
		if (!decl.className) { return; }
		const info: SymbolInfo = {
			name: decl.className,
			kind: 'enum',
			variants: decl.variants,
			line: decl.line,
			col: decl.col,
		};
		this.addType(decl.className, info);
		this.add(decl.className, info);
	}

	private collectUnion(decl: AstNode, currentNamespace?: string): void {
		if (!decl.className) { return; }
		const info: SymbolInfo = {
			name: decl.className,
			kind: 'union',
			fields: decl.fields,
			line: decl.line,
			col: decl.col,
		};
		this.addType(decl.className, info);
		this.add(decl.className, info);
	}

	private collectClass(decl: AstNode, currentNamespace?: string): void {
		if (!decl.className) { return; }
		const info: SymbolInfo = {
			name: decl.className,
			kind: 'class',
			fields: decl.fields,
			methods: this.collectMethods(decl.methods),
			baseName: decl.baseName,
			line: decl.line,
			col: decl.col,
		};
		this.addType(decl.className, info);
		this.add(decl.className, info);
	}

	private collectNamespace(decl: AstNode): void {
		if (!decl.className) { return; }
		const ns = new SymbolTable(this);
		ns.collectFromAst(decl, decl.className);
		this.namespaces.set(decl.className, ns);
		this.add(decl.className, {
			name: decl.className,
			kind: 'namespace',
			line: decl.line,
			col: decl.col,
		});
	}

	private collectTemplate(decl: AstNode, currentNamespace?: string): void {
		if (decl.templateBody) {
			this.collectDecl(decl.templateBody, currentNamespace);
		}
	}

	private collectMethods(methods: AstNode[]): SymbolInfo[] {
		const result: SymbolInfo[] = [];
		for (const method of methods) {
			if (method.funcName) {
				result.push({
					name: method.funcName,
					kind: 'method',
					returnType: method.returnType,
					params: method.params,
					line: method.line,
					col: method.col,
				});
			}
		}
		return result;
	}

	getNamespace(name: string): SymbolTable | undefined {
		return this.namespaces.get(name) || this.parent?.getNamespace(name);
	}
}