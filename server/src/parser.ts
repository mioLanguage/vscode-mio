import { Token, TokenKind, AstNode, AstNodeKind, Param, Field, Variant, TemplateParam } from './ast';
import { Lexer } from './lexer';

export class Parser {
	private lexer: Lexer;
	private cur: Token;
	private errors: string[] = [];

	constructor(source: string) {
		this.lexer = new Lexer(source);
		this.cur = this.lexer.nextToken();
	}

	getErrors(): string[] {
		return this.errors;
	}

	private error(msg: string): void {
		this.errors.push(`Line ${this.cur.line}:${this.cur.col}: ${msg}`);
	}

	private advance(): void {
		this.cur = this.lexer.nextToken();
	}

	private check(kind: TokenKind): boolean {
		return this.cur.kind === kind;
	}

	private match(kind: TokenKind): boolean {
		if (this.check(kind)) {
			this.advance();
			return true;
		}
		return false;
	}

	private expect(kind: TokenKind): boolean {
		if (this.match(kind)) { return true; }
		this.error(`Expected ${TokenKind[kind]}, got ${TokenKind[this.cur.kind]} '${this.cur.lexeme}'`);
		return false;
	}

	private skipToSemicolonOrBrace(): void {
		while (!this.check(TokenKind.EOF) && !this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.RBRACE)) {
			this.advance();
		}
	}

	private skipPastSemicolon(): void {
		while (!this.check(TokenKind.EOF) && !this.check(TokenKind.SEMICOLON)) {
			this.advance();
		}
		if (this.check(TokenKind.SEMICOLON)) { this.advance(); }
	}

	parse(): AstNode {
		const program = new AstNode(AstNodeKind.PROGRAM, 1, 1);
		while (!this.check(TokenKind.EOF)) {
			const decl = this.parseDecl();
			if (decl) {
				program.decls.push(decl);
			}
		}
		return program;
	}

	private parseDecl(): AstNode | null {
		switch (this.cur.kind) {
			case TokenKind.IMPORT: return this.parseImport();
			case TokenKind.EXTERN: return this.parseExtern();
			case TokenKind.MACRO: return this.parseMacro();
			case TokenKind.TEMPLATE: return this.parseTemplate();
			case TokenKind.ENUM: return this.parseEnum();
			case TokenKind.UNION: return this.parseUnion();
			case TokenKind.CLASS: return this.parseClass();
			case TokenKind.NAMESPACE: return this.parseNamespace();
			case TokenKind.VAR: return this.parseVarDecl();
			case TokenKind.CONST: return this.parseConstDecl();
			case TokenKind.STATIC: return this.parseStaticFunc();
			case TokenKind.AT_IF: return this.parseConditionalCompilation();
			case TokenKind.IDENT:
			case TokenKind.I8: case TokenKind.I16: case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U8: case TokenKind.U16: case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.USIZE: case TokenKind.ISIZE:
			case TokenKind.F32: case TokenKind.F64: case TokenKind.BOOL: case TokenKind.CHAR: case TokenKind.VOID:
				return this.parseFuncOrGlobal();
			case TokenKind.PUBLIC:
			case TokenKind.PRIVATE:
			case TokenKind.PROTECTED:
			case TokenKind.VIRTUAL:
			case TokenKind.OVERRIDE:
				return this.parseClassMember();
			default:
				this.error(`Unexpected token '${this.cur.lexeme}' at top level`);
				this.advance();
				return null;
		}
	}

	private parseImport(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip import

		const node = new AstNode(AstNodeKind.IMPORT, line, col);
		if (this.check(TokenKind.STRING_LIT)) {
			node.importPath = this.cur.lexeme;
			this.advance();
		} else {
			let path = '';
			while (this.check(TokenKind.IDENT)) {
				path += this.cur.lexeme;
				this.advance();
				if (this.check(TokenKind.DOT)) {
					path += '.';
					this.advance();
				} else {
					break;
				}
			}
			node.importPath = path;
		}

		this.match(TokenKind.SEMICOLON);
		// Handle comma-separated imports
		while (this.check(TokenKind.COMMA)) {
			this.advance();
			if (this.check(TokenKind.STRING_LIT)) {
				this.advance();
			} else {
				while (this.check(TokenKind.IDENT)) {
					this.advance();
					if (this.check(TokenKind.DOT)) { this.advance(); }
					else { break; }
				}
			}
		}
		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseExtern(): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip extern

		const node = this.parseFuncRest(line, col);
		if (node) {
			node.isExtern = true;
			this.match(TokenKind.SEMICOLON);
		}
		return node;
	}

	private parseMacro(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip macro

		const node = new AstNode(AstNodeKind.MACRO_DEF, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.macroName = this.cur.lexeme;
			this.advance();
		}
		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseTemplate(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip template

		const node = new AstNode(AstNodeKind.TEMPLATE_DEF, line, col);

		this.match(TokenKind.LT);
		node.templateParams = this.parseTemplateParams();
		this.match(TokenKind.GT);

		const body = this.parseTemplateBody();
		if (body) {
			node.templateBody = body;
		}
		return node;
	}

	private parseTemplateParams(): TemplateParam[] {
		const params: TemplateParam[] = [];
		if (this.check(TokenKind.IDENT)) {
			params.push(this.parseTemplateParam());
			while (this.check(TokenKind.COMMA)) {
				this.advance();
				params.push(this.parseTemplateParam());
			}
		}
		return params;
	}

	private parseTemplateParam(): TemplateParam {
		const param: TemplateParam = { name: '', isType: true };
		if (this.check(TokenKind.IDENT)) {
			param.name = this.cur.lexeme;
			this.advance();
		}
		if (this.check(TokenKind.COLON)) {
			this.advance();
			if (this.check(TokenKind.TYPENAME)) {
				this.advance();
				param.isType = true;
			} else if (this.check(TokenKind.IDENT)) {
				param.typeName = this.cur.lexeme;
				this.advance();
				param.isType = false;
				if (this.check(TokenKind.ASSIGN)) {
					this.advance();
					this.parseExpression(); // skip default value
				}
			}
		}
		return param;
	}

	private parseTemplateBody(): AstNode | null {
		switch (this.cur.kind) {
			case TokenKind.IDENT:
			case TokenKind.I8: case TokenKind.I16: case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U8: case TokenKind.U16: case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.USIZE: case TokenKind.ISIZE:
			case TokenKind.F32: case TokenKind.F64: case TokenKind.BOOL: case TokenKind.CHAR: case TokenKind.VOID:
				return this.parseFuncDef(this.cur.line, this.cur.col);
			default:
				this.error('Expected function after template');
				return null;
		}
	}

	private parseEnum(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip enum

		const node = new AstNode(AstNodeKind.ENUM_DEF, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.className = this.cur.lexeme;
			this.advance();
		}

		this.expect(TokenKind.LBRACE);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			if (this.check(TokenKind.IDENT)) {
				const varName = this.cur.lexeme;
				const varLine = this.cur.line;
				const varCol = this.cur.col;
				this.advance();
				const variant: Variant = { name: varName };
				if (this.check(TokenKind.ASSIGN)) {
					this.advance();
					variant.init = this.parsePrimary();
				}
				node.variants.push(variant);
			}
			this.match(TokenKind.COMMA);
			this.match(TokenKind.SEMICOLON);
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseUnion(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip union

		const node = new AstNode(AstNodeKind.UNION_DEF, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.className = this.cur.lexeme;
			this.advance();
		}

		this.expect(TokenKind.LBRACE);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			if (this.check(TokenKind.IDENT)) {
				const name = this.cur.lexeme;
				this.advance();
				if (this.check(TokenKind.COLON)) {
					this.advance();
					const typeName = this.parseTypeName();
					node.fields.push({ name, typeName });
				}
			}
			this.match(TokenKind.SEMICOLON);
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseClass(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip class

		const node = new AstNode(AstNodeKind.CLASS_DEF, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.className = this.cur.lexeme;
			this.advance();
		}

		// Inheritance: class Dog(Animal:public)
		if (this.check(TokenKind.LPAREN)) {
			this.advance();
			if (this.check(TokenKind.IDENT)) {
				node.baseName = this.cur.lexeme;
				this.advance();
			}
			if (this.check(TokenKind.COLON)) {
				this.advance();
				if (this.check(TokenKind.PUBLIC) || this.check(TokenKind.PRIVATE) || this.check(TokenKind.PROTECTED)) {
					node.baseAccess = this.cur.lexeme;
					this.advance();
				}
			}
			this.expect(TokenKind.RPAREN);
		}

		this.expect(TokenKind.LBRACE);
		this.parseClassBody(node);
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseClassBody(node: AstNode): void {
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			if (this.check(TokenKind.PUBLIC) || this.check(TokenKind.PRIVATE) || this.check(TokenKind.PROTECTED)) {
				this.advance();
				this.match(TokenKind.COLON);
			} else if (this.check(TokenKind.VIRTUAL)) {
				this.advance();
				const func = this.parseFuncDef(this.cur.line, this.cur.col);
				if (func) {
					func.isVirtual = true;
					node.methods.push(func);
				}
			} else if (this.check(TokenKind.OVERRIDE)) {
				this.advance();
				const func = this.parseFuncDef(this.cur.line, this.cur.col);
				if (func) {
					func.isOverride = true;
					node.methods.push(func);
				}
			} else if (this.check(TokenKind.STATIC)) {
				this.advance();
				const func = this.parseFuncDef(this.cur.line, this.cur.col);
				if (func) {
					func.isStatic = true;
					node.methods.push(func);
				}
			} else if (this.check(TokenKind.IDENT)) {
				const name = this.cur.lexeme;
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();

				if (this.check(TokenKind.COLON)) {
					this.advance();
					const typeName = this.parseTypeName();
					node.fields.push({ name, typeName });
					this.match(TokenKind.SEMICOLON);
				} else if (this.check(TokenKind.LPAREN)) {
					if (name === node.className) {
						const funcNode = this.parseConstructorRest(name, line, col);
						if (funcNode) { node.methods.push(funcNode); }
					} else if (name.startsWith('~')) {
						// Destructor
						this.advance(); // skip (
						this.expect(TokenKind.RPAREN);
						const funcNode = new AstNode(AstNodeKind.FUNC_DEF, line, col);
						funcNode.funcName = name;
						funcNode.body = this.parseBlock();
						node.methods.push(funcNode);
					} else {
						const funcNode = this.parseFuncRestWithName(name, line, col);
						if (funcNode) { node.methods.push(funcNode); }
					}
				} else {
					this.match(TokenKind.SEMICOLON);
				}
			} else if (this.isTypeToken(this.cur.kind)) {
				const func = this.parseFuncDef(this.cur.line, this.cur.col);
				if (func) { node.methods.push(func); }
			} else if (this.check(TokenKind.OPERATOR)) {
				const func = this.parseOperatorDef(this.cur.line, this.cur.col);
				if (func) { node.methods.push(func); }
			} else {
				this.advance();
			}
		}
	}

	private parseConstructorRest(name: string, line: number, col: number): AstNode {
		const node = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		node.funcName = name;
		node.returnType = name;

		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			node.params = this.parseParams();
		}
		this.expect(TokenKind.RPAREN);

		if (this.check(TokenKind.COLON)) {
			this.advance();
			while (!this.check(TokenKind.LBRACE) && !this.check(TokenKind.EOF)) {
				if (this.check(TokenKind.IDENT)) {
					this.advance();
					if (this.check(TokenKind.LPAREN)) {
						this.advance();
						let depth = 1;
						while (depth > 0 && !this.check(TokenKind.EOF)) {
							if (this.check(TokenKind.LPAREN)) { depth++; }
							if (this.check(TokenKind.RPAREN)) { depth--; }
							if (depth > 0) { this.advance(); }
						}
						this.advance();
					}
				}
				if (this.check(TokenKind.COMMA)) { this.advance(); }
				else { break; }
			}
		}

		node.body = this.parseBlock();
		return node;
	}

	private parseOperatorDef(line: number, col: number): AstNode {
		const node = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		this.advance();
		let op = '';
		if (this.check(TokenKind.PLUS)) { op = '+'; this.advance(); }
		else if (this.check(TokenKind.MINUS)) { op = '-'; this.advance(); }
		else if (this.check(TokenKind.STAR)) { op = '*'; this.advance(); }
		else if (this.check(TokenKind.SLASH)) { op = '/'; this.advance(); }
		else if (this.check(TokenKind.PERCENT)) { op = '%'; this.advance(); }
		else if (this.check(TokenKind.EQ)) { op = '=='; this.advance(); }
		else if (this.check(TokenKind.LT)) { op = '<'; this.advance(); }
		else if (this.check(TokenKind.GT)) { op = '>'; this.advance(); }
		node.funcName = 'operator' + op;

		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			node.params = this.parseParams();
		}
		this.expect(TokenKind.RPAREN);
		node.body = this.parseBlock();
		return node;
	}

	private parseNamespace(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip namespace

		const node = new AstNode(AstNodeKind.NAMESPACE_DEF, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.className = this.cur.lexeme;
			this.advance();
		}

		this.expect(TokenKind.LBRACE);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const decl = this.parseDecl();
			if (decl) {
				node.decls.push(decl);
			}
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseVarDecl(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip var

		const node = new AstNode(AstNodeKind.VAR_DECL, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.varName = this.cur.lexeme;
			this.advance();
		}

		if (this.check(TokenKind.COLON)) {
			this.advance();
			node.varType = this.parseTypeName();
		}

		if (this.check(TokenKind.ASSIGN)) {
			this.advance();
			node.initExpr = this.parseExpression();
		}

		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseConstDecl(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip const

		const node = new AstNode(AstNodeKind.CONST_DECL, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.varName = this.cur.lexeme;
			this.advance();
		}

		if (this.check(TokenKind.COLON)) {
			this.advance();
			node.varType = this.parseTypeName();
		}

		if (this.check(TokenKind.ASSIGN)) {
			this.advance();
			node.initExpr = this.parseExpression();
		}

		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseStaticFunc(): AstNode | null {
		this.advance(); // skip static
		const node = this.parseFuncDef(this.cur.line, this.cur.col);
		if (node) {
			node.isStatic = true;
		}
		return node;
	}

	private parseClassMember(): AstNode | null {
		// This is called when we see public/private/protected/virtual/override at top level
		// It's an error, but we try to recover
		while (this.check(TokenKind.PUBLIC) || this.check(TokenKind.PRIVATE) ||
			this.check(TokenKind.PROTECTED) || this.check(TokenKind.VIRTUAL) ||
			this.check(TokenKind.OVERRIDE)) {
			this.advance();
			if (this.check(TokenKind.COLON)) { this.advance(); }
		}
		return this.parseFuncDef(this.cur.line, this.cur.col);
	}

	private parseFuncOrGlobal(): AstNode | null {
		return this.parseFuncDef(this.cur.line, this.cur.col);
	}

	private parseFuncDef(line: number, col: number): AstNode | null {
		const returnType = this.parseTypeName();
		if (!returnType) { return null; }

		if (this.check(TokenKind.IDENT)) {
			const name = this.cur.lexeme;
			const nameLine = this.cur.line;
			const nameCol = this.cur.col;
			this.advance();

			if (this.check(TokenKind.LPAREN)) {
				return this.parseFuncRestWithReturnType(returnType, name, nameLine, nameCol);
			}
			// It's a global variable declaration with type
			const node = new AstNode(AstNodeKind.VAR_DECL, line, col);
			node.varName = name;
			node.varType = returnType;
			if (this.check(TokenKind.ASSIGN)) {
				this.advance();
				node.initExpr = this.parseExpression();
			}
			this.match(TokenKind.SEMICOLON);
			return node;
		}

		return null;
	}

	private parseFuncRest(line: number, col: number): AstNode | null {
		const returnType = this.parseTypeName();
		if (!returnType || !this.check(TokenKind.IDENT)) {
			this.error('Expected function name');
			this.skipToSemicolonOrBrace();
			return null;
		}

		const name = this.cur.lexeme;
		const nameLine = this.cur.line;
		const nameCol = this.cur.col;
		this.advance();

		if (!this.check(TokenKind.LPAREN)) {
			this.error('Expected ( after function name');
			return null;
		}

		return this.parseFuncRestWithReturnType(returnType, name, nameLine, nameCol);
	}

	private parseFuncRestWithReturnType(returnType: string, name: string, line: number, col: number): AstNode {
		const node = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		node.funcName = name;
		node.returnType = returnType;

		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			node.params = this.parseParams();
		}
		this.expect(TokenKind.RPAREN);

		if (this.check(TokenKind.LBRACE)) {
			node.body = this.parseBlock();
		} else {
			this.match(TokenKind.SEMICOLON);
		}

		return node;
	}

	private parseFuncRestWithName(name: string, line: number, col: number): AstNode {
		const node = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		node.funcName = name;

		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			node.params = this.parseParams();
		}
		this.expect(TokenKind.RPAREN);

		if (this.check(TokenKind.LBRACE)) {
			node.body = this.parseBlock();
		} else {
			this.match(TokenKind.SEMICOLON);
		}

		return node;
	}

	private parseParams(): Param[] {
		const params: Param[] = [];
		params.push(this.parseParam());
		while (this.check(TokenKind.COMMA)) {
			this.advance();
			params.push(this.parseParam());
		}
		return params;
	}

	private parseParam(): Param {
		const param: Param = { name: '', typeName: '' };
		if (this.check(TokenKind.IDENT)) {
			param.name = this.cur.lexeme;
			this.advance();
		}
		if (this.check(TokenKind.COLON)) {
			this.advance();
			param.typeName = this.parseTypeName();
		}
		if (this.check(TokenKind.ASSIGN)) {
			this.advance();
			param.defaultVal = this.parseExpression();
		}
		return param;
	}

	private parseTypeName(): string {
		let name = '';
		if (this.isTypeToken(this.cur.kind) || this.check(TokenKind.IDENT)) {
			name = this.cur.lexeme;
			this.advance();
			// Handle namespace::type
			if (this.check(TokenKind.DOUBLE_COLON)) {
				this.advance();
				if (this.check(TokenKind.IDENT)) {
					name += '::' + this.cur.lexeme;
					this.advance();
				}
			}
		}
		// Handle pointers
		while (this.check(TokenKind.STAR)) {
			name += '*';
			this.advance();
		}
		// Handle arrays
		if (this.check(TokenKind.LBRACKET)) {
			this.advance();
			if (this.check(TokenKind.INT_LIT)) {
				name += '[' + this.cur.lexeme + ']';
				this.advance();
			}
			this.expect(TokenKind.RBRACKET);
		}
		return name;
	}

	private isTypeToken(kind: TokenKind): boolean {
		return kind === TokenKind.I8 || kind === TokenKind.I16 ||
			kind === TokenKind.I32 || kind === TokenKind.I64 || kind === TokenKind.I128 ||
			kind === TokenKind.U8 || kind === TokenKind.U16 ||
			kind === TokenKind.U32 || kind === TokenKind.U64 || kind === TokenKind.U128 ||
			kind === TokenKind.USIZE || kind === TokenKind.ISIZE ||
			kind === TokenKind.F32 || kind === TokenKind.F64 ||
			kind === TokenKind.BOOL || kind === TokenKind.CHAR || kind === TokenKind.VOID;
	}

	private parseConditionalCompilation(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip @if

		// Skip condition expression
		if (this.check(TokenKind.NOT)) { this.advance(); }
		if (this.check(TokenKind.IDENT)) { this.advance(); }

		// Skip until @end
		let depth = 1;
		while (depth > 0 && !this.check(TokenKind.EOF)) {
			if (this.check(TokenKind.AT_IF)) { depth++; }
			if (this.check(TokenKind.AT_END)) { depth--; }
			this.advance();
		}

		return new AstNode(AstNodeKind.BLOCK, line, col);
	}

	private parseBlock(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.expect(TokenKind.LBRACE);

		const node = new AstNode(AstNodeKind.BLOCK, line, col);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const stmt = this.parseStmt();
			if (stmt) {
				node.stmts.push(stmt);
			}
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseStmt(): AstNode | null {
		switch (this.cur.kind) {
			case TokenKind.IF: return this.parseIfStmt();
			case TokenKind.WHILE: return this.parseWhileStmt();
			case TokenKind.FOR: return this.parseForStmt();
			case TokenKind.BREAK: return this.parseBreakStmt();
			case TokenKind.CONTINUE: return this.parseContinueStmt();
			case TokenKind.GOTO: return this.parseGotoStmt();
			case TokenKind.RETURN: return this.parseReturnStmt();
			case TokenKind.LBRACE: return this.parseBlock();
			case TokenKind.COLON: return this.parseLabelStmt();
			case TokenKind.VAR: return this.parseVarDecl();
			case TokenKind.CONST: return this.parseConstDecl();
			case TokenKind.SEMICOLON:
				this.advance();
				return null;
			default:
				return this.parseExprStmt();
		}
	}

	private parseIfStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip if

		this.match(TokenKind.COLON);

		const node = new AstNode(AstNodeKind.IF_STMT, line, col);
		node.condition = this.parseExpression();
		node.thenBlock = this.parseBlockOrStmt();

		while (this.check(TokenKind.ELIF)) {
			this.advance();
			this.match(TokenKind.COLON);
			const elifCond = this.parseExpression();
			const elifBody = this.parseBlockOrStmt();
			node.elifBlocks.push({ condition: elifCond, body: elifBody });
		}

		if (this.check(TokenKind.ELSE)) {
			this.advance();
			node.elseBlock = this.parseBlockOrStmt();
		}

		return node;
	}

	private parseBlockOrStmt(): AstNode {
		if (this.check(TokenKind.LBRACE)) {
			return this.parseBlock();
		}
		const stmt = this.parseStmt();
		if (stmt) { return stmt; }
		return new AstNode(AstNodeKind.BLOCK, this.cur.line, this.cur.col);
	}

	private parseWhileStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip while

		this.match(TokenKind.COLON);

		const node = new AstNode(AstNodeKind.WHILE_STMT, line, col);
		node.condition = this.parseExpression();
		node.thenBlock = this.parseBlockOrStmt();
		return node;
	}

	private parseForStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip for

		this.match(TokenKind.COLON);

		const node = new AstNode(AstNodeKind.FOR_STMT, line, col);
		if (!this.check(TokenKind.SEMICOLON)) {
			node.forInit = this.parseExpression();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.SEMICOLON)) {
			node.condition = this.parseExpression();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.LBRACE)) {
			node.forUpdate = this.parseExpression();
		}
		node.thenBlock = this.parseBlockOrStmt();
		return node;
	}

	private parseBreakStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.match(TokenKind.SEMICOLON);
		return new AstNode(AstNodeKind.BREAK_STMT, line, col);
	}

	private parseContinueStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.match(TokenKind.SEMICOLON);
		return new AstNode(AstNodeKind.CONTINUE_STMT, line, col);
	}

	private parseGotoStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const node = new AstNode(AstNodeKind.GOTO_STMT, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.labelName = this.cur.lexeme;
			this.advance();
		}
		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseLabelStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip :
		const node = new AstNode(AstNodeKind.LABEL_STMT, line, col);
		if (this.check(TokenKind.IDENT)) {
			node.labelName = this.cur.lexeme;
			this.advance();
		}
		return node;
	}

	private parseReturnStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const node = new AstNode(AstNodeKind.RETURN_STMT, line, col);
		if (!this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.RBRACE)) {
			node.returnExpr = this.parseExpression();
		}
		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseExprStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		const expr = this.parseExpression();
		this.match(TokenKind.SEMICOLON);
		const node = new AstNode(AstNodeKind.EXPR_STMT, line, col);
		node.left = expr;
		return node;
	}

	// Expression parsing with precedence
	private parseExpression(): AstNode {
		return this.parseAssignment();
	}

	private parseAssignment(): AstNode {
		const left = this.parseOr();
		if (this.check(TokenKind.ASSIGN)) {
			const line = this.cur.line;
			const col = this.cur.col;
			this.advance();
			const node = new AstNode(AstNodeKind.ASSIGN_EXPR, line, col);
			node.left = left;
			node.right = this.parseAssignment();
			return node;
		}
		return left;
	}

	private parseOr(): AstNode {
		let left = this.parseAnd();
		while (this.check(TokenKind.OR)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseAnd();
			left = node;
		}
		return left;
	}

	private parseAnd(): AstNode {
		let left = this.parseBitOr();
		while (this.check(TokenKind.AND)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseBitOr();
			left = node;
		}
		return left;
	}

	private parseBitOr(): AstNode {
		let left = this.parseBitXor();
		while (this.check(TokenKind.BIT_OR)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseBitXor();
			left = node;
		}
		return left;
	}

	private parseBitXor(): AstNode {
		let left = this.parseBitAnd();
		while (this.check(TokenKind.BIT_XOR)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseBitAnd();
			left = node;
		}
		return left;
	}

	private parseBitAnd(): AstNode {
		let left = this.parseEquality();
		while (this.check(TokenKind.BIT_AND)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseEquality();
			left = node;
		}
		return left;
	}

	private parseEquality(): AstNode {
		let left = this.parseComparison();
		while (this.check(TokenKind.EQ) || this.check(TokenKind.NEQ)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseComparison();
			left = node;
		}
		return left;
	}

	private parseComparison(): AstNode {
		let left = this.parseShift();
		while (this.check(TokenKind.LT) || this.check(TokenKind.GT) ||
			this.check(TokenKind.LTE) || this.check(TokenKind.GTE)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseShift();
			left = node;
		}
		return left;
	}

	private parseShift(): AstNode {
		let left = this.parseAddSub();
		while (this.check(TokenKind.LSHIFT) || this.check(TokenKind.RSHIFT)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseAddSub();
			left = node;
		}
		return left;
	}

	private parseAddSub(): AstNode {
		let left = this.parseMulDiv();
		while (this.check(TokenKind.PLUS) || this.check(TokenKind.MINUS)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseMulDiv();
			left = node;
		}
		return left;
	}

	private parseMulDiv(): AstNode {
		let left = this.parseUnary();
		while (this.check(TokenKind.STAR) || this.check(TokenKind.SLASH) || this.check(TokenKind.PERCENT)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, line, col);
			node.left = left;
			node.op = op;
			node.right = this.parseUnary();
			left = node;
		}
		return left;
	}

	private parseUnary(): AstNode {
		if (this.check(TokenKind.MINUS) || this.check(TokenKind.NOT) ||
			this.check(TokenKind.BIT_NOT) || this.check(TokenKind.BIT_AND) ||
			this.check(TokenKind.STAR)) {
			const line = this.cur.line;
			const col = this.cur.col;
			const op = this.cur.lexeme;
			const kind = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.UNARY_EXPR, line, col);
			node.op = op;
			node.operand = this.parseUnary();
			return node;
		}
		return this.parsePostfix();
	}

	private parsePostfix(): AstNode {
		let left = this.parsePrimary();

		while (true) {
			if (this.check(TokenKind.LPAREN)) {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				const node = new AstNode(AstNodeKind.CALL_EXPR, line, col);
				node.callee = left;
				if (!this.check(TokenKind.RPAREN)) {
					node.args.push(this.parseExpression());
					while (this.check(TokenKind.COMMA)) {
						this.advance();
						node.args.push(this.parseExpression());
					}
				}
				this.expect(TokenKind.RPAREN);
				left = node;
			} else if (this.check(TokenKind.LBRACKET)) {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				const node = new AstNode(AstNodeKind.INDEX_EXPR, line, col);
				node.left = left;
				node.indexExpr = this.parseExpression();
				this.expect(TokenKind.RBRACKET);
				left = node;
			} else if (this.check(TokenKind.DOT)) {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				const node = new AstNode(AstNodeKind.MEMBER_EXPR, line, col);
				node.left = left;
				if (this.check(TokenKind.IDENT)) {
					node.memberName = this.cur.lexeme;
					this.advance();
				}
				left = node;
			} else if (this.check(TokenKind.ARROW)) {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				const node = new AstNode(AstNodeKind.MEMBER_EXPR, line, col);
				node.left = left;
				node.arrow = true;
				if (this.check(TokenKind.IDENT)) {
					node.memberName = this.cur.lexeme;
					this.advance();
				}
				left = node;
			} else if (this.check(TokenKind.DOUBLE_COLON)) {
				// Namespace access, treat as member
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				const node = new AstNode(AstNodeKind.MEMBER_EXPR, line, col);
				node.left = left;
				if (this.check(TokenKind.IDENT)) {
					node.memberName = this.cur.lexeme;
					this.advance();
				}
				left = node;
			} else {
				break;
			}
		}

		return left;
	}

	private parsePrimary(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;

		// Cast expression: type(expr)
		if (this.isTypeToken(this.cur.kind)) {
			const typeName = this.cur.lexeme;
			const typeLine = this.cur.line;
			const typeCol = this.cur.col;
			this.advance();
			if (this.check(TokenKind.LPAREN)) {
				this.advance();
				const node = new AstNode(AstNodeKind.CAST_EXPR, typeLine, typeCol);
				node.castType = typeName;
				node.left = this.parseExpression();
				this.expect(TokenKind.RPAREN);
				return node;
			}
			// It's just an identifier named like a type
			const identNode = new AstNode(AstNodeKind.IDENT_EXPR, typeLine, typeCol);
			identNode.identName = typeName;
			return identNode;
		}

		switch (this.cur.kind) {
			case TokenKind.INT_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.INT_LIT, line, col);
				node.intVal = this.cur.lexeme ? parseInt(this.cur.lexeme) : 0;
				return node;
			}
			case TokenKind.FLOAT_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.FLOAT_LIT, line, col);
				return node;
			}
			case TokenKind.STRING_LIT: {
				const node = new AstNode(AstNodeKind.STRING_LIT, line, col);
				node.stringVal = this.cur.lexeme;
				this.advance();
				return node;
			}
			case TokenKind.CHAR_LIT: {
				const node = new AstNode(AstNodeKind.CHAR_LIT, line, col);
				node.charVal = this.cur.charVal;
				this.advance();
				return node;
			}
			case TokenKind.TRUE:
			case TokenKind.FALSE: {
				const node = new AstNode(AstNodeKind.BOOL_LIT, line, col);
				node.boolVal = this.cur.kind === TokenKind.TRUE;
				this.advance();
				return node;
			}
			case TokenKind.IDENT: {
				const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
				node.identName = this.cur.lexeme;
				this.advance();
				return node;
			}
			case TokenKind.LPAREN: {
				this.advance();
				const expr = this.parseExpression();
				this.expect(TokenKind.RPAREN);
				return expr;
			}
			case TokenKind.LBRACKET: {
				// Array literal: {1, 2, 3}
				return this.parseArrayLiteral();
			}
			case TokenKind.LBRACE: {
				return this.parseBlock();
			}
			default:
				this.error(`Unexpected token '${this.cur.lexeme}' in expression`);
				this.advance();
				return new AstNode(AstNodeKind.IDENT_EXPR, line, col);
		}
	}

	private parseArrayLiteral(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance(); // skip {

		let count = 0;
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			this.parseExpression();
			count++;
			if (!this.check(TokenKind.RBRACE)) {
				this.match(TokenKind.COMMA);
			}
		}
		this.expect(TokenKind.RBRACE);

		const node = new AstNode(AstNodeKind.INT_LIT, line, col);
		node.intVal = count;
		return node;
	}
}