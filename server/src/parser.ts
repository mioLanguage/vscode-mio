import { Token, TokenKind, AstNode, AstNodeKind, Param, Field, Variant, TemplateParam, tokenName } from './ast';
import { Lexer } from './lexer';

export class Parser {
	private lexer: Lexer;
	private cur: Token;
	private errors: string[] = [];
	private classNames: Set<string> = new Set();
	private classBaseMap: Map<string, string> = new Map();
	private classVirtualMethods: Map<string, Set<string>> = new Map();
	private classMethodNames: Map<string, Set<string>> = new Map();

	constructor(source: string) {
		this.lexer = new Lexer(source);
		this.cur = this.lexer.nextToken();
	}

	getErrors(): string[] {
		return [...this.lexer.errors, ...this.errors];
	}

	getSkippedRanges(): { startLine: number; startCol: number; endLine: number; endCol: number }[] {
		return this.lexer.skippedRanges;
	}

	private error(msg: string): void {
		this.errors.push(`Line ${this.cur.line}:${this.cur.col}: ${msg}`);
	}

	private errorExpected(expected: string): void {
		if (this.cur.kind === TokenKind.ERROR) {
			this.error(this.cur.lexeme);
		} else {
			this.error(`expected '${expected}', got '${tokenName(this.cur.kind)}'`);
		}
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
		this.errorExpected(tokenName(kind));
		return false;
	}

	private isKeywordToken(kind: TokenKind): boolean {
		switch (kind) {
			case TokenKind.IMPORT: case TokenKind.EXTERN: case TokenKind.VAR: case TokenKind.CONST:
			case TokenKind.IF: case TokenKind.ELSE: case TokenKind.WHILE: case TokenKind.FOR:
			case TokenKind.BREAK: case TokenKind.CONTINUE: case TokenKind.GOTO: case TokenKind.RETURN:
			case TokenKind.ENUM: case TokenKind.UNION: case TokenKind.CLASS: case TokenKind.NAMESPACE:
			case TokenKind.PUBLIC: case TokenKind.PRIVATE: case TokenKind.PROTECTED:
			case TokenKind.VIRTUAL: case TokenKind.OVERRIDE: case TokenKind.STATIC: case TokenKind.OPERATOR:
			case TokenKind.TRUE: case TokenKind.FALSE: case TokenKind.THIS:
			case TokenKind.I8: case TokenKind.I16: case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U8: case TokenKind.U16: case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.USIZE: case TokenKind.ISIZE: case TokenKind.F32: case TokenKind.F64:
			case TokenKind.BOOL: case TokenKind.CHAR: case TokenKind.VOID:
			case TokenKind.TEMPLATE: case TokenKind.TYPENAME: case TokenKind.SIZEOF:
				return true;
			default: return false;
		}
	}

	private isTypeToken(kind: TokenKind): boolean {
		switch (kind) {
			case TokenKind.I8: case TokenKind.I16: case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U8: case TokenKind.U16: case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.USIZE: case TokenKind.ISIZE: case TokenKind.F32: case TokenKind.F64:
			case TokenKind.BOOL: case TokenKind.CHAR: case TokenKind.VOID: case TokenKind.IDENT:
			case TokenKind.STAR: case TokenKind.BIT_AND:
				return true;
			default: return false;
		}
	}

	private expectIdent(): boolean {
		if (this.cur.kind === TokenKind.IDENT) {
			this.advance();
			return true;
		}
		if (this.isKeywordToken(this.cur.kind)) {
			this.error(`keyword '${tokenName(this.cur.kind)}' cannot be used as an identifier`);
		} else {
			this.errorExpected('identifier');
		}
		return false;
	}

	parse(): AstNode {
		const program = new AstNode(AstNodeKind.PROGRAM, 0, 0);
		while (!this.check(TokenKind.EOF)) {
			const decl = this.parseDecl();
			if (decl) { program.decls.push(decl); }
		}
		return program;
	}

	private parseDecl(): AstNode | null {
		while (this.match(TokenKind.SEMICOLON)) {}
		switch (this.cur.kind) {
			case TokenKind.IMPORT: {
				this.advance();
				const line = this.cur.line;
				const col = this.cur.col;
				const first = this.parseSingleImport(line, col);
				if (!this.match(TokenKind.COMMA)) {
					this.expect(TokenKind.SEMICOLON);
					return first;
				}
				const block = new AstNode(AstNodeKind.BLOCK, line, col);
				block.isScope = false;
				if (first) { block.stmts.push(first); }
				do {
					const imp = this.parseSingleImport(line, col);
					if (imp) { block.stmts.push(imp); }
				} while (this.match(TokenKind.COMMA));
				this.expect(TokenKind.SEMICOLON);
				return block.stmts.length > 0 ? block : null;
			}
			case TokenKind.EXTERN: {
				this.advance();
				if (this.match(TokenKind.VAR)) {
					return this.parseVarDecl(false, false, true, true);
				}
				if (this.match(TokenKind.CONST)) {
					return this.parseVarDecl(true, false, true, true);
				}
				return this.parseFuncDef(false, true);
			}
			case TokenKind.VAR:
				return this.parseVarDecl(false, false);
			case TokenKind.CONST:
				return this.parseVarDecl(true, false);
			case TokenKind.STATIC: {
				this.advance();
				if (this.match(TokenKind.VAR)) {
					return this.parseVarDecl(false, true);
				}
				if (this.match(TokenKind.CONST)) {
					return this.parseVarDecl(true, true);
				}
				return this.parseFuncDef(true);
			}
			case TokenKind.ENUM:
				return this.parseEnumDef();
			case TokenKind.UNION:
				return this.parseUnionDef();
			case TokenKind.CLASS:
				return this.parseClassDef();
			case TokenKind.NAMESPACE:
				return this.parseNamespaceDef();
			case TokenKind.TEMPLATE:
				return this.parseTemplateDef();
			case TokenKind.EOF:
				return null;
			default: {
				let mv = this.match(TokenKind.VIRTUAL);
				if (!mv) { mv = this.match(TokenKind.OVERRIDE); }
				if (mv || this.isTypeToken(this.cur.kind)) {
					return this.parseFuncDef(false);
				}
				this.error('expected declaration');
				while (!this.check(TokenKind.EOF) && !this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.RBRACE)) {
					this.advance();
				}
				this.advance();
				return null;
			}
		}
	}

	private parseSingleImport(line: number, col: number): AstNode | null {
		if (this.check(TokenKind.STRING_LIT)) {
			const node = new AstNode(AstNodeKind.IMPORT, line, col);
			node.importPath = this.cur.lexeme;
			this.advance();
			return node;
		} else if (this.check(TokenKind.IDENT)) {
			const path = this.parseImportPath();
			if (path) {
				const node = new AstNode(AstNodeKind.NAMESPACE_IMPORT, line, col);
				node.namespaceImportName = path;
				return node;
			}
			return null;
		} else {
			this.errorExpected('import path');
			return null;
		}
	}

	private parseImportPath(): string {
		let buf = '';
		while (this.check(TokenKind.IDENT)) {
			buf += this.cur.lexeme;
			this.advance();
			if (this.match(TokenKind.DOUBLE_COLON)) {
				buf += '::';
			} else {
				break;
			}
		}
		if (buf === '') {
			this.errorExpected('import path');
			return '';
		}
		return buf;
	}

	private parseBaseType(): string {
		switch (this.cur.kind) {
			case TokenKind.I8: this.advance(); return 'i8';
			case TokenKind.I16: this.advance(); return 'i16';
			case TokenKind.I32: this.advance(); return 'i32';
			case TokenKind.I64: this.advance(); return 'i64';
			case TokenKind.I128: this.advance(); return 'i128';
			case TokenKind.U8: this.advance(); return 'u8';
			case TokenKind.U16: this.advance(); return 'u16';
			case TokenKind.U32: this.advance(); return 'u32';
			case TokenKind.U64: this.advance(); return 'u64';
			case TokenKind.U128: this.advance(); return 'u128';
			case TokenKind.USIZE: this.advance(); return 'usize';
			case TokenKind.ISIZE: this.advance(); return 'isize';
			case TokenKind.F32: this.advance(); return 'f32';
			case TokenKind.F64: this.advance(); return 'f64';
			case TokenKind.BOOL: this.advance(); return 'bool';
			case TokenKind.CHAR: this.advance(); return 'char';
			case TokenKind.VOID: this.advance(); return 'void';
			case TokenKind.IDENT: {
				const name = this.cur.lexeme;
				this.advance();
				if (this.match(TokenKind.DOUBLE_COLON)) {
					if (this.cur.kind !== TokenKind.IDENT) {
						this.errorExpected("type name after '::'");
						return '';
					}
					const fullName = name + '::' + this.cur.lexeme;
					this.advance();
					let result = fullName;
					if (this.match(TokenKind.DOLLAR)) {
						result += '$';
						do {
							result += this.parseType();
						} while (this.match(TokenKind.COMMA));
						if (!this.match(TokenKind.DOLLAR)) {
							this.errorExpected("'$'");
						}
						result += '$';
					}
					return result;
				}
				let result = name;
				if (this.match(TokenKind.DOLLAR)) {
					result += '$';
					do {
						result += this.parseType();
					} while (this.match(TokenKind.COMMA));
					if (!this.match(TokenKind.DOLLAR)) {
						this.errorExpected("'$'");
					}
					result += '$';
				}
				return result;
			}
			default:
				this.errorExpected('type');
				return '';
		}
	}

	private parseType(): string {
		return this.parseTypePrefix();
	}

	private parseTypePrefix(): string {
		if (this.match(TokenKind.STAR)) {
			const base = this.parseTypePrefix();
			return '*' + base;
		}
		if (this.match(TokenKind.BIT_AND)) {
			if (this.match(TokenKind.BIT_AND)) {
				this.error("too many '&' in reference type");
				return '&&' + this.parseTypePrefix();
			}
			const base = this.parseTypePrefix();
			return '&' + base;
		}
		if (this.match(TokenKind.AND)) {
			const base = this.parseTypePrefix();
			return '&&' + base;
		}
		return this.parseBaseTypeWithSuffix();
	}

	private parseBaseTypeWithSuffix(): string {
		const base = this.parseBaseType();
		return this.parseTypeSuffix(base);
	}

	private parseTypeSuffix(base: string): string {
		let result = base;
		while (this.match(TokenKind.LBRACKET)) {
			if (this.cur.kind === TokenKind.INT_LIT) {
				const size = this.cur.lexeme;
				this.advance();
				this.expect(TokenKind.RBRACKET);
				result += '[' + size + ']';
			} else {
				this.expect(TokenKind.RBRACKET);
				result += '[]';
			}
		}
		return result;
	}

	private parsePrimary(): AstNode {
		const t = this.cur;
		switch (t.kind) {
			case TokenKind.INT_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.INT_LIT, t.line, t.col);
				node.intVal = t.intVal;
				return node;
			}
			case TokenKind.FLOAT_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.FLOAT_LIT, t.line, t.col);
				node.floatVal = t.floatVal;
				return node;
			}
			case TokenKind.STRING_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.STRING_LIT, t.line, t.col);
				node.stringVal = t.lexeme;
				return node;
			}
			case TokenKind.CHAR_LIT: {
				this.advance();
				const node = new AstNode(AstNodeKind.CHAR_LIT, t.line, t.col);
				node.charVal = t.lexeme;
				return node;
			}
			case TokenKind.SIZEOF: {
				this.advance();
				this.expect(TokenKind.LPAREN);
				const targetType = this.parseType();
				this.expect(TokenKind.RPAREN);
				const node = new AstNode(AstNodeKind.SIZEOF_EXPR, t.line, t.col);
				node.sizeofTargetType = targetType;
				return node;
			}
			case TokenKind.TRUE: {
				this.advance();
				const node = new AstNode(AstNodeKind.BOOL_LIT, t.line, t.col);
				node.boolVal = true;
				return node;
			}
			case TokenKind.FALSE: {
				this.advance();
				const node = new AstNode(AstNodeKind.BOOL_LIT, t.line, t.col);
				node.boolVal = false;
				return node;
			}
			case TokenKind.THIS: {
				this.advance();
				const node = new AstNode(AstNodeKind.IDENT_EXPR, t.line, t.col);
				node.identName = 'this';
				return node;
			}
			case TokenKind.IDENT: {
				const name = t.lexeme;
				const line = t.line;
				const col = t.col;
				this.advance();
				if (this.cur.kind === TokenKind.STAR && this.lexer.peekToken?.kind === TokenKind.LPAREN) {
					this.advance();
					this.advance();
					const expr = this.parseExpr();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, line, col);
					node.castType = '*' + name;
					node.left = expr;
					return node;
				}
				if (this.match(TokenKind.DOUBLE_COLON)) {
					if (this.cur.kind !== TokenKind.IDENT) {
						this.errorExpected("identifier after '::'");
						const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
						node.identName = name;
						return node;
					}
					const n = new AstNode(AstNodeKind.IDENT_EXPR, this.cur.line, this.cur.col);
					n.identName = this.cur.lexeme;
					n.namespaceName = name;
					this.advance();
					return n;
				}
				const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
				node.identName = name;
				return node;
			}
			case TokenKind.DOUBLE_COLON: {
				this.advance();
				if (this.cur.kind !== TokenKind.IDENT) {
					this.errorExpected("identifier after '::'");
					return new AstNode(AstNodeKind.INT_LIT, t.line, t.col);
				}
				const n = new AstNode(AstNodeKind.IDENT_EXPR, this.cur.line, this.cur.col);
				n.identName = this.cur.lexeme;
				n.namespaceName = '::';
				this.advance();
				return n;
			}
			case TokenKind.LPAREN: {
				this.advance();
				const expr = this.parseExpr();
				this.expect(TokenKind.RPAREN);
				return expr;
			}
			case TokenKind.LBRACE: {
				this.advance();
				const arr = new AstNode(AstNodeKind.ARRAY_LIT, t.line, t.col);
				if (!this.check(TokenKind.RBRACE)) {
					arr.arrayElements.push(this.parseExpr());
					while (this.match(TokenKind.COMMA)) {
						if (this.check(TokenKind.RBRACE)) { break; }
						arr.arrayElements.push(this.parseExpr());
					}
				}
				this.expect(TokenKind.RBRACE);
				return arr;
			}
			case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.F32: case TokenKind.F64:
			case TokenKind.BOOL: case TokenKind.CHAR: {
				let typeName = '';
				switch (t.kind) {
					case TokenKind.I32: typeName = 'i32'; break;
					case TokenKind.I64: typeName = 'i64'; break;
					case TokenKind.I128: typeName = 'i128'; break;
					case TokenKind.U32: typeName = 'u32'; break;
					case TokenKind.U64: typeName = 'u64'; break;
					case TokenKind.U128: typeName = 'u128'; break;
					case TokenKind.F32: typeName = 'f32'; break;
					case TokenKind.F64: typeName = 'f64'; break;
					case TokenKind.BOOL: typeName = 'bool'; break;
					case TokenKind.CHAR: typeName = 'char'; break;
				}
				this.advance();
				if (this.check(TokenKind.STAR) && this.lexer.peekToken?.kind === TokenKind.LPAREN) {
					this.advance();
					this.advance();
					const expr = this.parseExpr();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, t.line, t.col);
					node.castType = '*' + typeName;
					node.left = expr;
					return node;
				}
				if (this.check(TokenKind.LPAREN)) {
					this.advance();
					const expr = this.parseExpr();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, t.line, t.col);
					node.castType = typeName;
					node.left = expr;
					return node;
				}
				this.errorExpected('expression');
				return new AstNode(AstNodeKind.INT_LIT, t.line, t.col);
			}
			default:
				this.errorExpected('expression');
				this.advance();
				return new AstNode(AstNodeKind.INT_LIT, t.line, t.col);
		}
	}

	private parsePostfix(): AstNode {
		let expr = this.parsePrimary();
		while (true) {
			if (expr.kind === AstNodeKind.IDENT_EXPR && this.check(TokenKind.DOLLAR)) {
				if (this.lexer.isTemplateInstantiation()) {
					this.advance();
					const call = new AstNode(AstNodeKind.CALL_EXPR, expr.line, expr.col);
					call.callee = expr;
					call.templateArgs = [];
					do {
						if (this.isTypeToken(this.cur.kind)) {
							call.templateArgs.push({ isType: true, typeName: this.parseType() });
						} else {
							call.templateArgs.push({ isType: false, expr: this.parseExpr() });
						}
					} while (this.match(TokenKind.COMMA));
					if (!this.match(TokenKind.DOLLAR)) {
						this.errorExpected("'$'");
					}
					if (this.match(TokenKind.LPAREN)) {
						if (!this.check(TokenKind.RPAREN)) {
							call.args.push(this.parseExpr());
							while (this.match(TokenKind.COMMA)) {
								call.args.push(this.parseExpr());
							}
						}
						this.expect(TokenKind.RPAREN);
					}
					expr = call;
					continue;
				} else {
					this.error("unexpected '$' after identifier");
					this.advance();
				}
			}
			if (this.match(TokenKind.LPAREN)) {
				const call = new AstNode(AstNodeKind.CALL_EXPR, expr.line, expr.col);
				call.callee = expr;
				if (!this.check(TokenKind.RPAREN)) {
					call.args.push(this.parseExpr());
					while (this.match(TokenKind.COMMA)) {
						call.args.push(this.parseExpr());
					}
				}
				this.expect(TokenKind.RPAREN);
				expr = call;
			} else if (this.match(TokenKind.LBRACKET)) {
				const index = this.parseExpr();
				this.expect(TokenKind.RBRACKET);
				const idxNode = new AstNode(AstNodeKind.INDEX_EXPR, expr.line, expr.col);
				idxNode.left = expr;
				idxNode.indexExpr = index;
				expr = idxNode;
			} else if (this.match(TokenKind.DOT)) {
				if (this.cur.kind !== TokenKind.IDENT) {
					if (this.isKeywordToken(this.cur.kind)) {
						this.error(`keyword '${tokenName(this.cur.kind)}' cannot be used as a member name`);
					} else {
						this.errorExpected("identifier after '.'");
					}
					break;
				}
				const memNode = new AstNode(AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
				memNode.left = expr;
				memNode.memberName = this.cur.lexeme;
				memNode.arrow = false;
				this.advance();
				expr = memNode;
			} else if (this.match(TokenKind.ARROW)) {
				if (this.cur.kind !== TokenKind.IDENT) {
					if (this.isKeywordToken(this.cur.kind)) {
						this.error(`keyword '${tokenName(this.cur.kind)}' cannot be used as a member name`);
					} else {
						this.errorExpected("identifier after '->'");
					}
					break;
				}
				const memNode = new AstNode(AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
				memNode.left = expr;
				memNode.memberName = this.cur.lexeme;
				memNode.arrow = true;
				this.advance();
				expr = memNode;
			} else {
				break;
			}
		}
		return expr;
	}

	private parseUnary(): AstNode {
		const op = this.cur.kind;
		switch (op) {
			case TokenKind.MINUS:
			case TokenKind.NOT:
			case TokenKind.BIT_NOT:
			case TokenKind.STAR:
			case TokenKind.BIT_AND:
				this.advance();
				const node = new AstNode(AstNodeKind.UNARY_EXPR, this.cur.line, this.cur.col);
				node.op = TokenKind[op];
				node.operand = this.parseUnary();
				return node;
			default:
				return this.parsePostfix();
		}
	}

	private parseMultiplicative(): AstNode {
		let left = this.parseUnary();
		while (true) {
			const op = this.cur.kind;
			if (op === TokenKind.STAR || op === TokenKind.SLASH || op === TokenKind.PERCENT) {
				this.advance();
				const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
				node.left = left;
				node.op = TokenKind[op];
				node.right = this.parseUnary();
				left = node;
			} else {
				break;
			}
		}
		return left;
	}

	private parseAdditive(): AstNode {
		let left = this.parseMultiplicative();
		while (true) {
			const op = this.cur.kind;
			if (op === TokenKind.PLUS || op === TokenKind.MINUS) {
				this.advance();
				const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
				node.left = left;
				node.op = TokenKind[op];
				node.right = this.parseMultiplicative();
				left = node;
			} else {
				break;
			}
		}
		return left;
	}

	private parseShift(): AstNode {
		let left = this.parseAdditive();
		while (true) {
			const op = this.cur.kind;
			if (op === TokenKind.LSHIFT || op === TokenKind.RSHIFT) {
				this.advance();
				const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
				node.left = left;
				node.op = TokenKind[op];
				node.right = this.parseAdditive();
				left = node;
			} else {
				break;
			}
		}
		return left;
	}

	private parseRelational(): AstNode {
		let left = this.parseShift();
		while (true) {
			const op = this.cur.kind;
			if (op === TokenKind.LT || op === TokenKind.GT || op === TokenKind.LTE || op === TokenKind.GTE) {
				this.advance();
				const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
				node.left = left;
				node.op = TokenKind[op];
				node.right = this.parseShift();
				left = node;
			} else {
				break;
			}
		}
		return left;
	}

	private parseEquality(): AstNode {
		let left = this.parseRelational();
		while (true) {
			const op = this.cur.kind;
			if (op === TokenKind.EQ || op === TokenKind.NEQ) {
				this.advance();
				const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
				node.left = left;
				node.op = TokenKind[op];
				node.right = this.parseRelational();
				left = node;
			} else {
				break;
			}
		}
		return left;
	}

	private parseBitAnd(): AstNode {
		let left = this.parseEquality();
		while (this.match(TokenKind.BIT_AND)) {
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = 'BIT_AND';
			node.right = this.parseEquality();
			left = node;
		}
		return left;
	}

	private parseBitXor(): AstNode {
		let left = this.parseBitAnd();
		while (this.match(TokenKind.BIT_XOR)) {
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = 'BIT_XOR';
			node.right = this.parseBitAnd();
			left = node;
		}
		return left;
	}

	private parseBitOr(): AstNode {
		let left = this.parseBitXor();
		while (this.match(TokenKind.BIT_OR)) {
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = 'BIT_OR';
			node.right = this.parseBitXor();
			left = node;
		}
		return left;
	}

	private parseLogicalAnd(): AstNode {
		let left = this.parseBitOr();
		while (this.match(TokenKind.AND)) {
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = 'AND';
			node.right = this.parseBitOr();
			left = node;
		}
		return left;
	}

	private parseLogicalOr(): AstNode {
		let left = this.parseLogicalAnd();
		while (this.match(TokenKind.OR)) {
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = 'OR';
			node.right = this.parseLogicalAnd();
			left = node;
		}
		return left;
	}

	private parseAssignment(): AstNode {
		const left = this.parseLogicalOr();
		const assignOps = [
			TokenKind.ASSIGN, TokenKind.PLUS_ASSIGN, TokenKind.MINUS_ASSIGN,
			TokenKind.STAR_ASSIGN, TokenKind.SLASH_ASSIGN, TokenKind.PERCENT_ASSIGN,
			TokenKind.AND_ASSIGN, TokenKind.OR_ASSIGN, TokenKind.XOR_ASSIGN,
			TokenKind.LSHIFT_ASSIGN, TokenKind.RSHIFT_ASSIGN,
		];
		if (assignOps.includes(this.cur.kind)) {
			const op = this.cur.kind;
			this.advance();
			const right = this.parseAssignment();
			const node = new AstNode(AstNodeKind.ASSIGN_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = right;
			return node;
		}
		return left;
	}

	private parseExpr(): AstNode {
		return this.parseAssignment();
	}

	private parseBlock(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.expect(TokenKind.LBRACE);
		const block = new AstNode(AstNodeKind.BLOCK, line, col);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const stmt = this.parseStmt();
			if (stmt) { block.stmts.push(stmt); }
		}
		this.expect(TokenKind.RBRACE);
		return block;
	}

	private parseVarItems(isConst: boolean, isStatic: boolean, isExtern: boolean): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		const name = this.cur.lexeme;
		if (!this.expectIdent()) {
			return new AstNode(AstNodeKind.INT_LIT, line, col);
		}
		let typeName = '';
		let initExpr: AstNode | undefined;
		if (this.match(TokenKind.COLON)) {
			typeName = this.parseType();
		}
		if (this.match(TokenKind.ASSIGN)) {
			initExpr = this.parseExpr();
		}
		if (!typeName && !initExpr) {
			this.error(`variable '${name}' requires a type or an initializer`);
		}
		if (initExpr && initExpr.kind === AstNodeKind.ARRAY_LIT) {
			if (typeName && typeName.endsWith('[]')) {
				typeName = typeName.replace('[]', '[' + initExpr.arrayElements.length + ']');
			} else if (!typeName) {
				let base = 'i32';
				if (initExpr.arrayElements.length > 0) {
					const first = initExpr.arrayElements[0];
					switch (first.kind) {
						case AstNodeKind.INT_LIT: base = 'i32'; break;
						case AstNodeKind.FLOAT_LIT: base = 'f64'; break;
						case AstNodeKind.BOOL_LIT: base = 'bool'; break;
						case AstNodeKind.CHAR_LIT: base = 'char'; break;
						case AstNodeKind.STRING_LIT: base = 'char'; break;
					}
				}
				typeName = base + '[' + initExpr.arrayElements.length + ']';
			}
		}
		const node = new AstNode(isConst ? AstNodeKind.CONST_DECL : AstNodeKind.VAR_DECL, line, col);
		node.varName = name;
		node.varType = typeName || undefined;
		node.initExpr = initExpr;
		node.isStatic = isStatic;
		node.isExtern = isExtern;
		return node;
	}

	private parseVarDecl(isConst: boolean, isStatic: boolean, isExtern: boolean = false, skipAdvance: boolean = false): AstNode {
		if (!skipAdvance) { this.advance(); }
		const block = new AstNode(AstNodeKind.BLOCK, this.cur.line, this.cur.col);
		block.isScope = false;
		block.stmts.push(this.parseVarItems(isConst, isStatic, isExtern));
		while (this.match(TokenKind.COMMA)) {
			block.stmts.push(this.parseVarItems(isConst, isStatic, isExtern));
		}
		this.expect(TokenKind.SEMICOLON);
		return block;
	}

	private parseIfStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.LPAREN);
		const cond = this.parseExpr();
		this.expect(TokenKind.RPAREN);
		if (this.check(TokenKind.RBRACE)) {
			this.error("expected statement after 'if'");
			const node = new AstNode(AstNodeKind.IF_STMT, line, col);
			node.condition = cond;
			return node;
		}
		const thenBody = this.parseStmt();
		const node = new AstNode(AstNodeKind.IF_STMT, line, col);
		node.condition = cond;
		node.thenBlock = thenBody || undefined;
		if (this.match(TokenKind.ELSE)) {
			if (this.check(TokenKind.RBRACE)) {
				this.error("expected statement after 'else'");
				return node;
			}
			node.elseBlock = this.parseStmt() || undefined;
		}
		return node;
	}

	private parseWhileStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.LPAREN);
		const cond = this.parseExpr();
		this.expect(TokenKind.RPAREN);
		if (this.check(TokenKind.RBRACE)) {
			this.error("expected statement after 'while'");
			const node = new AstNode(AstNodeKind.WHILE_STMT, line, col);
			node.condition = cond;
			return node;
		}
		const body = this.parseStmt();
		const node = new AstNode(AstNodeKind.WHILE_STMT, line, col);
		node.condition = cond;
		node.thenBlock = body || undefined;
		return node;
	}

	private parseForStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.LPAREN);
		let init: AstNode | undefined;
		let cond: AstNode | undefined;
		let update: AstNode | undefined;
		if (this.match(TokenKind.VAR)) {
			init = this.parseVarItems(false, false, false);
		} else if (this.match(TokenKind.CONST)) {
			init = this.parseVarItems(true, false, false);
		} else if (!this.check(TokenKind.SEMICOLON)) {
			init = this.parseExpr();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.SEMICOLON)) {
			cond = this.parseExpr();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.RPAREN)) {
			update = this.parseExpr();
		}
		this.expect(TokenKind.RPAREN);
		if (this.check(TokenKind.RBRACE)) {
			this.error("expected statement after 'for'");
			const node = new AstNode(AstNodeKind.FOR_STMT, line, col);
			node.forInit = init;
			node.condition = cond;
			node.forUpdate = update;
			return node;
		}
		const body = this.parseStmt();
		const node = new AstNode(AstNodeKind.FOR_STMT, line, col);
		node.forInit = init;
		node.condition = cond;
		node.forUpdate = update;
		node.thenBlock = body || undefined;
		return node;
	}

	private parseReturnStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		let value: AstNode | undefined;
		if (!this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.RBRACE)) {
			value = this.parseExpr();
		}
		this.expect(TokenKind.SEMICOLON);
		const node = new AstNode(AstNodeKind.RETURN_STMT, line, col);
		node.returnExpr = value;
		return node;
	}

	private parseStmt(): AstNode | null {
		switch (this.cur.kind) {
			case TokenKind.VAR:
				return this.parseVarDecl(false, false);
			case TokenKind.CONST:
				return this.parseVarDecl(true, false);
			case TokenKind.IF:
				return this.parseIfStmt();
			case TokenKind.WHILE:
				return this.parseWhileStmt();
			case TokenKind.FOR:
				return this.parseForStmt();
			case TokenKind.BREAK:
				this.advance();
				this.expect(TokenKind.SEMICOLON);
				return new AstNode(AstNodeKind.BREAK_STMT, this.cur.line, this.cur.col);
			case TokenKind.CONTINUE:
				this.advance();
				this.expect(TokenKind.SEMICOLON);
				return new AstNode(AstNodeKind.CONTINUE_STMT, this.cur.line, this.cur.col);
			case TokenKind.GOTO: {
				this.advance();
				const line = this.cur.line;
				const col = this.cur.col;
				const label = this.cur.lexeme;
				if (!this.expectIdent()) { this.expect(TokenKind.SEMICOLON); return null; }
				this.expect(TokenKind.SEMICOLON);
				const node = new AstNode(AstNodeKind.GOTO_STMT, line, col);
				node.labelName = label;
				return node;
			}
			case TokenKind.COLON: {
				this.advance();
				const line = this.cur.line;
				const col = this.cur.col;
				const label = this.cur.lexeme;
				if (!this.expectIdent()) { return null; }
				const node = new AstNode(AstNodeKind.LABEL_STMT, line, col);
				node.labelName = label;
				return node;
			}
			case TokenKind.RETURN:
				return this.parseReturnStmt();
			case TokenKind.LBRACE:
				return this.parseBlock();
			case TokenKind.SEMICOLON:
				this.advance();
				return null;
			default: {
				const expr = this.parseExpr();
				if (!expr) {
					this.error('failed to parse expression');
					return null;
				}
				if (this.match(TokenKind.SEMICOLON)) {
					const node = new AstNode(AstNodeKind.EXPR_STMT, expr.line, expr.col);
					node.left = expr;
					return node;
				}
				const node = new AstNode(AstNodeKind.RETURN_STMT, expr.line, expr.col);
				node.returnExpr = expr;
				return node;
			}
		}
	}

	private parseFuncDef(isStatic: boolean, isExtern: boolean = false, preParsedReturnType?: AstNode): AstNode | null {
		const line = preParsedReturnType ? preParsedReturnType.line : this.cur.line;
		const col = preParsedReturnType ? preParsedReturnType.col : this.cur.col;
		let returnType = '';
		if (preParsedReturnType) {
			returnType = preParsedReturnType.returnType || '';
		} else {
			returnType = this.parseType();
		}
		let isOperator = false;
		let funcName = '';
		let opName = '';
		if (this.match(TokenKind.OPERATOR)) {
			isOperator = true;
			funcName = 'operator' + TokenKind[this.cur.kind];
			opName = TokenKind[this.cur.kind];
			if (this.cur.kind === TokenKind.LBRACKET) {
				this.advance();
				this.expect(TokenKind.RBRACKET);
			} else {
				this.advance();
			}
		} else if (this.cur.kind === TokenKind.IDENT) {
			funcName = this.cur.lexeme;
			this.advance();
		} else if (this.cur.kind === TokenKind.LPAREN) {
			funcName = returnType || 'constructor';
		} else if (this.isKeywordToken(this.cur.kind)) {
			this.error(`keyword '${tokenName(this.cur.kind)}' cannot be used as a function name`);
			return null;
		} else {
			this.errorExpected('function name');
			return null;
		}
		const func = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		func.funcName = funcName;
		func.returnType = returnType;
		func.isStatic = isStatic;
		func.isExtern = isExtern;
		func.isOperator = isOperator;
		if (isOperator) { func.opName = opName; }
		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			do {
				if (this.match(TokenKind.VARARG)) {
					func.isVariadic = true;
					break;
				}
				const pname = this.cur.lexeme;
				if (!this.expectIdent()) { continue; }
				this.expect(TokenKind.COLON);
				const ptype = this.parseType();
				if (!ptype) {
					this.error(`expected type for parameter '${pname}'`);
					continue;
				}
				let defaultVal: AstNode | undefined;
				if (this.match(TokenKind.ASSIGN)) {
					defaultVal = this.parseExpr();
					if (!defaultVal) {
						this.error("expected default value after '='");
					}
				}
				func.params.push({ name: pname, typeName: ptype, defaultVal });
			} while (this.match(TokenKind.COMMA));
		}
		this.expect(TokenKind.RPAREN);
		if (this.match(TokenKind.ASSIGN)) {
			if (this.cur.kind === TokenKind.INT_LIT && this.cur.intVal === 0) {
				func.isPureVirtual = true;
				this.advance();
			} else {
				this.error("expected '0' after '=' for pure virtual function");
			}
		}
		if (!isOperator && !func.isPureVirtual && this.match(TokenKind.COLON)) {
			func.initList = [];
			while (!this.check(TokenKind.LBRACE) && !this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.EOF)) {
				if (this.cur.kind === TokenKind.IDENT) {
					const fieldName = this.cur.lexeme;
					this.advance();
					if (this.match(TokenKind.LPAREN)) {
						const initExpr = this.parseExpr();
						this.expect(TokenKind.RPAREN);
						func.initList.push({ name: fieldName, expr: initExpr });
					} else if (this.match(TokenKind.ASSIGN)) {
						const initExpr = this.parseExpr();
						func.initList.push({ name: fieldName, expr: initExpr });
					} else {
						this.error(`expected '(' or '=' after field name '${fieldName}' in initializer list`);
					}
				} else {
					this.error(`expected field name in initializer list, got '${tokenName(this.cur.kind)}'`);
					this.advance();
				}
				if (!this.match(TokenKind.COMMA)) { break; }
			}
		}
		if (isExtern || func.isPureVirtual) {
			this.expect(TokenKind.SEMICOLON);
		} else {
			func.body = this.parseBlock();
		}
		return func;
	}

	private parseEnumDef(): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		if (!this.expectIdent()) { return null; }
		this.expect(TokenKind.LBRACE);
		const e = new AstNode(AstNodeKind.ENUM_DEF, line, col);
		e.className = name;
		if (!this.check(TokenKind.RBRACE)) {
			do {
				const vname = this.cur.lexeme;
				if (!this.expectIdent()) { continue; }
				let init: AstNode | undefined;
				if (this.match(TokenKind.ASSIGN)) {
					init = this.parseExpr();
				}
				e.variants.push({ name: vname, init });
			} while (this.match(TokenKind.COMMA));
		}
		this.expect(TokenKind.RBRACE);
		return e;
	}

	private parseUnionDef(): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		if (!this.expectIdent()) { return null; }
		this.expect(TokenKind.LBRACE);
		const u = new AstNode(AstNodeKind.UNION_DEF, line, col);
		u.className = name;
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const fname = this.cur.lexeme;
			if (!this.expectIdent()) {
				while (!this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.EOF) && !this.check(TokenKind.RBRACE)) { this.advance(); }
				if (!this.check(TokenKind.RBRACE)) { this.advance(); }
				continue;
			}
			this.expect(TokenKind.COLON);
			const ftype = this.parseType();
			this.expect(TokenKind.SEMICOLON);
			u.fields.push({ name: fname, typeName: ftype });
		}
		this.expect(TokenKind.RBRACE);
		return u;
	}

	private parseClassDef(classConsumed: boolean = false): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		if (!classConsumed) { this.advance(); }
		const name = this.cur.lexeme;
		if (!this.expectIdent()) { return null; }
		if (this.classNames.has(name)) {
			this.error(`class '${name}' is already defined`);
		}
		this.classNames.add(name);
		let baseName = '';
		let baseAccess = '';
		if (this.match(TokenKind.LPAREN)) {
			if (this.cur.kind !== TokenKind.IDENT) {
				this.error("expected base class name after '('");
				return null;
			}
			baseName = this.cur.lexeme;
			this.advance();
			if (!this.classNames.has(baseName)) {
				this.error(`base class '${baseName}' is not defined (forward declaration not supported)`);
			}
			if (this.match(TokenKind.COLON)) {
				if ((this.cur.kind as TokenKind) === TokenKind.PUBLIC || (this.cur.kind as TokenKind) === TokenKind.PRIVATE || (this.cur.kind as TokenKind) === TokenKind.PROTECTED) {
					baseAccess = tokenName(this.cur.kind);
					this.advance();
				} else {
					this.error("expected 'public', 'private', or 'protected' after ':' in base class declaration");
					return null;
				}
			}
			this.expect(TokenKind.RPAREN);
		}
		this.expect(TokenKind.LBRACE);
		const c = new AstNode(AstNodeKind.CLASS_DEF, line, col);
		c.className = name;
		c.baseName = baseName || undefined;
		c.baseAccess = baseAccess || undefined;
		this.classBaseMap.set(name, baseName);
		let curAccess = 'public';
		const fieldNames: Set<string> = new Set();
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			if (this.match(TokenKind.PUBLIC)) {
				this.expect(TokenKind.COLON);
				curAccess = 'public';
			} else if (this.match(TokenKind.PRIVATE)) {
				this.expect(TokenKind.COLON);
				curAccess = 'private';
			} else if (this.match(TokenKind.PROTECTED)) {
				this.expect(TokenKind.COLON);
				curAccess = 'protected';
			} else {
				let matchedVirtual = this.match(TokenKind.VIRTUAL);
				let matchedOverride = false;
				if (!matchedVirtual) { matchedOverride = this.match(TokenKind.OVERRIDE); }
				let matchedStatic = false;
				if (!matchedVirtual && !matchedOverride) { matchedStatic = this.match(TokenKind.STATIC); }
				if (matchedOverride) {
					if (!baseName) {
						this.error("'override' can only be used in a class that inherits from a base class");
					}
				}
				if (matchedVirtual || matchedOverride || matchedStatic) {
					if (matchedOverride && !matchedVirtual) {
						matchedVirtual = true;
					}
					const method = this.parseFuncDef(matchedStatic);
					if (method) {
						method.isVirtual = matchedVirtual;
						method.isOverride = matchedOverride;
						method.classNameForFunc = name;
						method.access = curAccess;
						if (matchedOverride && baseName) {
							const vm = this.classVirtualMethods.get(baseName);
							if (!vm || !vm.has(method.funcName || '')) {
								this.error(`method '${method.funcName}' marked 'override' but does not override any base class virtual method`);
							}
						}
						if (matchedVirtual && !method.isPureVirtual) {
							if (!this.classVirtualMethods.has(name)) { this.classVirtualMethods.set(name, new Set()); }
							this.classVirtualMethods.get(name)!.add(method.funcName || '');
						}
						if (method.isPureVirtual) {
							if (!this.classVirtualMethods.has(name)) { this.classVirtualMethods.set(name, new Set()); }
							this.classVirtualMethods.get(name)!.add(method.funcName || '');
						}
						if (matchedOverride && !method.isPureVirtual) {
							if (!this.classVirtualMethods.has(name)) { this.classVirtualMethods.set(name, new Set()); }
							this.classVirtualMethods.get(name)!.add(method.funcName || '');
						}
						if (!method.isOperator) {
							if (!this.classMethodNames.has(name)) { this.classMethodNames.set(name, new Set()); }
							if (this.classMethodNames.get(name)!.has(method.funcName || '')) {
								this.error(`method '${method.funcName}' is already defined in class '${name}'`);
							}
							this.classMethodNames.get(name)!.add(method.funcName || '');
						}
						if (method.funcName === name) {
							c.constructors.push(method);
						} else {
							c.methods.push(method);
						}
					}
				} else if (this.match(TokenKind.BIT_NOT)) {
					const dline = this.cur.line;
					const dcol = this.cur.col;
					const dname = this.cur.lexeme;
					if (!this.expectIdent()) { continue; }
					if (dname !== name) {
						this.error(`destructor name '${dname}' must match class name '${name}'`);
						if (this.match(TokenKind.LPAREN)) { this.match(TokenKind.RPAREN); }
						if (this.check(TokenKind.LBRACE)) { this.parseBlock(); }
						continue;
					}
					this.expect(TokenKind.LPAREN);
					this.expect(TokenKind.RPAREN);
					const dtor = new AstNode(AstNodeKind.FUNC_DEF, dline, dcol);
					dtor.funcName = '~' + name;
					dtor.returnType = 'void';
					dtor.classNameForFunc = name;
					dtor.access = curAccess;
					dtor.body = this.parseBlock();
					c.destructor = dtor;
				} else if (this.match(TokenKind.CLASS)) {
					const nested = this.parseClassDef(true);
					if (nested) {
						const nestedName = nested.className || '';
						if (nestedName.indexOf('::') === -1) {
							nested.className = name + '::' + nestedName;
						}
						c.nestedClasses.push(nested);
					}
				} else if (this.isTypeToken(this.cur.kind)) {
					if (this.cur.kind === TokenKind.IDENT && this.lexer.peekToken?.kind === TokenKind.COLON) {
						const fname = this.cur.lexeme;
						this.advance();
						if (fieldNames.has(fname)) {
							this.error(`field '${fname}' is already defined in class '${name}'`);
						}
						fieldNames.add(fname);
						this.expect(TokenKind.COLON);
						const ftype = this.parseType();
						let init: AstNode | undefined;
						if (this.match(TokenKind.ASSIGN)) {
							init = this.parseExpr();
						}
						this.expect(TokenKind.SEMICOLON);
						c.fields.push({ name: fname, typeName: ftype, init, access: curAccess });
					} else {
						const method = this.parseFuncDef(false);
						if (method) {
							method.classNameForFunc = name;
							method.access = curAccess;
							if (method.funcName === name) {
								c.constructors.push(method);
							} else {
								if (!method.isOperator) {
									if (!this.classMethodNames.has(name)) { this.classMethodNames.set(name, new Set()); }
									if (this.classMethodNames.get(name)!.has(method.funcName || '')) {
										this.error(`method '${method.funcName}' is already defined in class '${name}'`);
									}
									this.classMethodNames.get(name)!.add(method.funcName || '');
								}
								c.methods.push(method);
							}
						}
					}
				} else if (this.isKeywordToken(this.cur.kind)) {
					this.error(`keyword '${tokenName(this.cur.kind)}' cannot be used as a class member name`);
					this.advance();
				} else {
					this.error(`expected field, method, or access specifier in class '${name}', got '${tokenName(this.cur.kind)}'`);
					this.advance();
				}
			}
		}
		this.expect(TokenKind.RBRACE);
		this.match(TokenKind.SEMICOLON);
		return c;
	}

	private parseNamespaceDef(): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		if (!this.expectIdent()) { return null; }
		const n = new AstNode(AstNodeKind.NAMESPACE_DEF, line, col);
		n.className = name;
		this.expect(TokenKind.LBRACE);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const decl = this.parseDecl();
			if (decl) { n.decls.push(decl); }
		}
		this.expect(TokenKind.RBRACE);
		return n;
	}

	private parseTemplateDef(): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		if (!this.match(TokenKind.DOLLAR)) {
			this.errorExpected("'$' after 'template'");
			return null;
		}
		const typeParams: TemplateParam[] = [];
		do {
			const tp: TemplateParam = { name: '', isType: false };
			const tpName = this.cur.lexeme;
			if (!this.expectIdent()) { return null; }
			tp.name = tpName;
			if (this.match(TokenKind.COLON)) {
				if (this.match(TokenKind.TYPENAME)) {
					tp.isType = true;
				} else {
					tp.typeName = this.parseType();
					if (!tp.typeName) {
						this.error("expected type after ':' in template parameter");
						return null;
					}
				}
			} else {
				tp.isType = true;
			}
			if (this.match(TokenKind.ASSIGN)) {
				if (tp.isType) {
					const defaultType = this.parseType();
					if (!defaultType) {
						this.error("expected default type after '=' in template parameter");
						return null;
					}
					tp.typeName = defaultType;
				} else {
					const defaultVal = this.parseExpr();
					if (!defaultVal) {
						this.error("expected default value after '=' in template parameter");
						return null;
					}
				}
			}
			typeParams.push(tp);
		} while (this.match(TokenKind.COMMA));
		if (!this.match(TokenKind.DOLLAR)) {
			this.errorExpected("'$' after template parameters");
			return null;
		}
		const def = this.parseDecl();
		if (!def) {
			this.error('expected declaration after template');
			return null;
		}
		const node = new AstNode(AstNodeKind.TEMPLATE_DEF, line, col);
		node.templateParams = typeParams;
		node.templateBody = def;
		return node;
	}
}