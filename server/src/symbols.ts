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
	filePath?: string;
	line: number;
	col: number;
}

export interface FunctionScope {
	funcName: string;
	returnType: string;
	startLine: number;
	endLine: number;
	locals: Map<string, SymbolInfo>;
}

export class SymbolTable {
	symbols: Map<string, SymbolInfo> = new Map();
	types: Map<string, SymbolInfo> = new Map();
	namespaces: Map<string, SymbolTable> = new Map();
	functionScopes: FunctionScope[] = [];
	typeRanges: { name: string; kind: string; startLine: number; endLine: number; fields?: Field[]; methods?: SymbolInfo[]; variants?: Variant[] }[] = [];
	private parent?: SymbolTable;

	constructor(parent?: SymbolTable) {
		this.parent = parent;
	}

	add(name: string, info: SymbolInfo): void {
		if (!this.symbols.has(name)) {
			this.symbols.set(name, info);
		}
	}

	addType(name: string, info: SymbolInfo): void {
		if (!this.types.has(name)) {
			this.types.set(name, info);
		}
	}

	get(name: string): SymbolInfo | undefined {
		const sym = this.symbols.get(name);
		if (sym) { return sym; }
		for (const [, ns] of this.namespaces) {
			const nsSym = ns.symbols.get(name);
			if (nsSym) { return nsSym; }
		}
		return this.parent?.get(name);
	}

	getType(name: string): SymbolInfo | undefined {
		const ty = this.types.get(name);
		if (ty) { return ty; }
		for (const [, ns] of this.namespaces) {
			const nsTy = ns.types.get(name);
			if (nsTy) { return nsTy; }
		}
		return this.parent?.getType(name);
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

	setFilePath(filePath: string): void {
		for (const [, sym] of this.symbols) {
			sym.filePath = filePath;
		}
		for (const [, sym] of this.types) {
			sym.filePath = filePath;
		}
		for (const [, ns] of this.namespaces) {
			ns.setFilePath(filePath);
		}
	}

	mergeInto(target: SymbolTable): void {
		for (const [name, sym] of this.symbols) {
			target.symbols.set(name, sym);
		}
		for (const [name, sym] of this.types) {
			target.types.set(name, sym);
		}
		for (const [name, ns] of this.namespaces) {
			target.namespaces.set(name, ns);
		}
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
		const scope: FunctionScope = {
			funcName: name,
			returnType: decl.returnType || 'void',
			startLine: decl.line,
			endLine: Number.MAX_SAFE_INTEGER,
			locals: new Map(),
		};
		for (const p of decl.params) {
			scope.locals.set(p.name, {
				name: p.name,
				kind: 'variable',
				typeName: p.typeName,
				line: decl.line,
				col: decl.col,
			});
		}
		if (decl.body) {
			this.collectStmts(decl.body.stmts, scope);
		}
		this.functionScopes.push(scope);
	}

	private collectStmts(stmts: AstNode[], scope?: FunctionScope): void {
		for (const stmt of stmts) {
			switch (stmt.kind) {
				case AstNodeKind.VAR_DECL:
					this.collectVariable(stmt, undefined, scope);
					break;
				case AstNodeKind.CONST_DECL:
					this.collectConstant(stmt, undefined, scope);
					break;
				case AstNodeKind.IF_STMT:
					if (stmt.thenBlock) { this.collectStmts(stmt.thenBlock.stmts, scope); }
					if (stmt.elseBlock) { this.collectStmts(stmt.elseBlock.stmts, scope); }
					break;
				case AstNodeKind.WHILE_STMT:
					if (stmt.thenBlock) { this.collectStmts(stmt.thenBlock.stmts, scope); }
					break;
				case AstNodeKind.FOR_STMT:
					if (stmt.thenBlock) { this.collectStmts(stmt.thenBlock.stmts, scope); }
					break;
				case AstNodeKind.BLOCK:
					if (stmt.stmts) { this.collectStmts(stmt.stmts, scope); }
					break;
				default:
					break;
			}
		}
	}

	private collectVariable(decl: AstNode, currentNamespace?: string, scope?: FunctionScope): void {
		if (!decl.varName) { return; }
		const info: SymbolInfo = {
			name: decl.varName,
			kind: 'variable',
			typeName: decl.varType,
			line: decl.line,
			col: decl.col,
		};
		this.add(decl.varName, info);
		if (scope) {
			scope.locals.set(decl.varName, info);
		}
	}

	private collectConstant(decl: AstNode, currentNamespace?: string, scope?: FunctionScope): void {
		if (!decl.varName) { return; }
		const info: SymbolInfo = {
			name: decl.varName,
			kind: 'constant',
			typeName: decl.varType,
			line: decl.line,
			col: decl.col,
		};
		this.add(decl.varName, info);
		if (scope) {
			scope.locals.set(decl.varName, info);
		}
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
		this.typeRanges.push({
			name: decl.className,
			kind: 'enum',
			startLine: decl.line,
			endLine: Number.MAX_SAFE_INTEGER,
			variants: decl.variants,
		});
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
		this.typeRanges.push({
			name: decl.className,
			kind: 'union',
			startLine: decl.line,
			endLine: Number.MAX_SAFE_INTEGER,
			fields: decl.fields,
		});
	}

	private collectClass(decl: AstNode, currentNamespace?: string): void {
		if (!decl.className) { return; }
		const methods = this.collectMethods(decl.methods);
		const ctors = this.collectMethods(decl.constructors);
		const allMethods = [...ctors, ...methods];
		const info: SymbolInfo = {
			name: decl.className,
			kind: 'class',
			fields: decl.fields,
			methods: allMethods,
			baseName: decl.baseName,
			line: decl.line,
			col: decl.col,
		};
		this.addType(decl.className, info);
		this.add(decl.className, info);
		this.typeRanges.push({
			name: decl.className,
			kind: 'class',
			startLine: decl.line,
			endLine: Number.MAX_SAFE_INTEGER,
			fields: decl.fields,
			methods: allMethods,
		});
		for (const method of allMethods) {
			this.add(method.name, method);
		}
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

	getScopeAtLine(line: number): FunctionScope | undefined {
		for (let i = this.functionScopes.length - 1; i >= 0; i--) {
			const s = this.functionScopes[i];
			if (line >= s.startLine && line <= s.endLine) {
				return s;
			}
		}
		return undefined;
	}
}