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

	getSkippedRanges(): { startLine: number; startCol: number; endLine: number; endCol: number }[] {
		return this.lexer.skippedRanges;
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
		this.error(`Expected '${TokenKind[kind]}', got '${TokenKind[this.cur.kind]}'`);
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

	parse(): AstNode {
		const program = new AstNode(AstNodeKind.PROGRAM, 1, 1);
		while (!this.check(TokenKind.EOF)) {
			while (this.match(TokenKind.SEMICOLON)) {}
			const decl = this.parseDecl();
			if (decl) {
				program.decls.push(decl);
			}
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
				this.error(`Expected declaration, got '${TokenKind[this.cur.kind]}'`);
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
			const node = new AstNode(AstNodeKind.NAMESPACE_IMPORT, line, col);
			node.namespaceImportName = this.cur.lexeme;
			this.advance();
			return node;
		}
		return null;
	}

	private parseTypeName(): string {
		let typeName = '';
		if (this.match(TokenKind.STAR)) {
			typeName = '*' + this.parseTypeName();
			return typeName;
		}
		if (this.match(TokenKind.BIT_AND)) {
			if (this.match(TokenKind.BIT_AND)) {
				return '&&' + this.parseTypeName();
			}
			return '&' + this.parseTypeName();
		}
		if (this.match(TokenKind.AND)) {
			return '&&' + this.parseTypeName();
		}
		if (this.check(TokenKind.IDENT)) {
			typeName = this.cur.lexeme;
			this.advance();
			if (this.match(TokenKind.DOUBLE_COLON)) {
				typeName += '::' + this.cur.lexeme;
				this.advance();
			}
			if (this.match(TokenKind.DOLLAR)) {
				typeName += '$';
				do {
					typeName += this.parseTypeName();
				} while (this.match(TokenKind.COMMA));
				this.expect(TokenKind.DOLLAR);
				typeName += '$';
			}
		} else {
			switch (this.cur.kind) {
				case TokenKind.I8: typeName = 'i8'; this.advance(); break;
				case TokenKind.I16: typeName = 'i16'; this.advance(); break;
				case TokenKind.I32: typeName = 'i32'; this.advance(); break;
				case TokenKind.I64: typeName = 'i64'; this.advance(); break;
				case TokenKind.I128: typeName = 'i128'; this.advance(); break;
				case TokenKind.U8: typeName = 'u8'; this.advance(); break;
				case TokenKind.U16: typeName = 'u16'; this.advance(); break;
				case TokenKind.U32: typeName = 'u32'; this.advance(); break;
				case TokenKind.U64: typeName = 'u64'; this.advance(); break;
				case TokenKind.U128: typeName = 'u128'; this.advance(); break;
				case TokenKind.USIZE: typeName = 'usize'; this.advance(); break;
				case TokenKind.ISIZE: typeName = 'isize'; this.advance(); break;
				case TokenKind.F32: typeName = 'f32'; this.advance(); break;
				case TokenKind.F64: typeName = 'f64'; this.advance(); break;
				case TokenKind.BOOL: typeName = 'bool'; this.advance(); break;
				case TokenKind.CHAR: typeName = 'char'; this.advance(); break;
				case TokenKind.VOID: typeName = 'void'; this.advance(); break;
				default:
					this.error('Expected type');
					typeName = '';
			}
		}
		while (this.match(TokenKind.LBRACKET)) {
			if (this.check(TokenKind.INT_LIT)) {
				typeName += '[' + this.cur.lexeme + ']';
				this.advance();
			} else {
				typeName += '[]';
			}
			this.expect(TokenKind.RBRACKET);
		}
		return typeName;
	}

	private parseVarItems(isConst: boolean, isStatic: boolean, isExtern: boolean): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		const name = this.cur.lexeme;
		this.advance();
		let typeName = '';
		let initExpr: AstNode | undefined;
		if (this.match(TokenKind.COLON)) {
			typeName = this.parseTypeName();
		}
		if (this.match(TokenKind.ASSIGN)) {
			initExpr = this.parseExpression();
		}
		if (!typeName && !initExpr) {
			this.error(`Variable '${name}' requires a type or an initializer`);
		}
		const node = new AstNode(isConst ? AstNodeKind.CONST_DECL : AstNodeKind.VAR_DECL, line, col);
		node.varName = name;
		node.varType = typeName;
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

	private parseExpression(): AstNode {
		return this.parseAssignment();
	}

	private parseAssignment(): AstNode {
		let left = this.parseLogicalOr();
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

	private parseEquality(): AstNode {
		let left = this.parseRelational();
		while (this.check(TokenKind.EQ) || this.check(TokenKind.NEQ)) {
			const op = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = this.parseRelational();
			left = node;
		}
		return left;
	}

	private parseRelational(): AstNode {
		let left = this.parseShift();
		while (this.check(TokenKind.LT) || this.check(TokenKind.GT) || this.check(TokenKind.LTE) || this.check(TokenKind.GTE)) {
			const op = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = this.parseShift();
			left = node;
		}
		return left;
	}

	private parseShift(): AstNode {
		let left = this.parseAdditive();
		while (this.check(TokenKind.LSHIFT) || this.check(TokenKind.RSHIFT)) {
			const op = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = this.parseAdditive();
			left = node;
		}
		return left;
	}

	private parseAdditive(): AstNode {
		let left = this.parseMultiplicative();
		while (this.check(TokenKind.PLUS) || this.check(TokenKind.MINUS)) {
			const op = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = this.parseMultiplicative();
			left = node;
		}
		return left;
	}

	private parseMultiplicative(): AstNode {
		let left = this.parseUnary();
		while (this.check(TokenKind.STAR) || this.check(TokenKind.SLASH) || this.check(TokenKind.PERCENT)) {
			const op = this.cur.kind;
			this.advance();
			const node = new AstNode(AstNodeKind.BINARY_EXPR, left.line, left.col);
			node.left = left;
			node.op = TokenKind[op];
			node.right = this.parseUnary();
			left = node;
		}
		return left;
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

	private parsePostfix(): AstNode {
		let expr = this.parsePrimary();
		while (true) {
			if (expr.kind === AstNodeKind.IDENT_EXPR && this.check(TokenKind.DOLLAR)) {
				this.advance();
				const call = new AstNode(AstNodeKind.CALL_EXPR, expr.line, expr.col);
				call.callee = expr;
				do {
					if (this.isTypeToken(this.cur.kind)) {
						call.templateArgs = call.templateArgs || [];
						call.templateArgs.push({ isType: true, typeName: this.parseTypeName() });
					} else {
						call.templateArgs = call.templateArgs || [];
						call.templateArgs.push({ isType: false, expr: this.parseExpression() });
					}
				} while (this.match(TokenKind.COMMA));
				this.expect(TokenKind.DOLLAR);
				if (this.match(TokenKind.LPAREN)) {
					if (!this.check(TokenKind.RPAREN)) {
						call.args.push(this.parseExpression());
						while (this.match(TokenKind.COMMA)) {
							call.args.push(this.parseExpression());
						}
					}
					this.expect(TokenKind.RPAREN);
				}
				expr = call;
				continue;
			}
			if (this.match(TokenKind.LPAREN)) {
				const call = new AstNode(AstNodeKind.CALL_EXPR, expr.line, expr.col);
				call.callee = expr;
				if (!this.check(TokenKind.RPAREN)) {
					call.args.push(this.parseExpression());
					while (this.match(TokenKind.COMMA)) {
						call.args.push(this.parseExpression());
					}
				}
				this.expect(TokenKind.RPAREN);
				expr = call;
			} else if (this.match(TokenKind.LBRACKET)) {
				const index = this.parseExpression();
				this.expect(TokenKind.RBRACKET);
				const idxNode = new AstNode(AstNodeKind.INDEX_EXPR, expr.line, expr.col);
				idxNode.left = expr;
				idxNode.indexExpr = index;
				expr = idxNode;
			} else if (this.match(TokenKind.DOT)) {
				if (this.isKeywordToken(this.cur.kind)) {
					this.error(`Keyword '${this.cur.lexeme}' cannot be used as a member name`);
					break;
				}
				const member = new AstNode(AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
				member.left = expr;
				member.memberName = this.cur.lexeme;
				member.arrow = false;
				this.advance();
				expr = member;
			} else if (this.match(TokenKind.ARROW)) {
				if (this.isKeywordToken(this.cur.kind)) {
					this.error(`Keyword '${this.cur.lexeme}' cannot be used as a member name`);
					break;
				}
				const member = new AstNode(AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
				member.left = expr;
				member.memberName = this.cur.lexeme;
				member.arrow = true;
				this.advance();
				expr = member;
			} else {
				break;
			}
		}
		return expr;
	}

	private parsePrimary(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		switch (this.cur.kind) {
			case TokenKind.INT_LIT: {
				const node = new AstNode(AstNodeKind.INT_LIT, line, col);
				node.intVal = this.cur.intVal;
				this.advance();
				return node;
			}
			case TokenKind.FLOAT_LIT: {
				const node = new AstNode(AstNodeKind.FLOAT_LIT, line, col);
				node.floatVal = this.cur.floatVal;
				this.advance();
				return node;
			}
			case TokenKind.STRING_LIT: {
				const node = new AstNode(AstNodeKind.STRING_LIT, line, col);
				node.stringVal = this.cur.stringVal;
				this.advance();
				return node;
			}
			case TokenKind.CHAR_LIT: {
				const node = new AstNode(AstNodeKind.CHAR_LIT, line, col);
				node.charVal = this.cur.charVal;
				this.advance();
				return node;
			}
			case TokenKind.SIZEOF: {
				this.advance();
				this.expect(TokenKind.LPAREN);
				const typeName = this.parseTypeName();
				this.expect(TokenKind.RPAREN);
				const node = new AstNode(AstNodeKind.SIZEOF_EXPR, line, col);
				node.sizeofTargetType = typeName;
				return node;
			}
			case TokenKind.TRUE: {
				const node = new AstNode(AstNodeKind.BOOL_LIT, line, col);
				node.boolVal = true;
				this.advance();
				return node;
			}
			case TokenKind.FALSE: {
				const node = new AstNode(AstNodeKind.BOOL_LIT, line, col);
				node.boolVal = false;
				this.advance();
				return node;
			}
			case TokenKind.THIS: {
				this.advance();
				const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
				node.identName = 'this';
				return node;
			}
			case TokenKind.IDENT: {
				const name = this.cur.lexeme;
				this.advance();
				if (this.check(TokenKind.STAR) && this.lexer.peekToken().kind === TokenKind.LPAREN) {
					this.advance();
					this.advance();
					const expr = this.parseExpression();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, line, col);
					node.castType = '*' + name;
					node.left = expr;
					return node;
				}
				if (this.match(TokenKind.DOUBLE_COLON)) {
					const nsNode = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
					nsNode.identName = this.cur.lexeme;
					nsNode.namespaceName = name;
					this.advance();
					return nsNode;
				}
				const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
				node.identName = name;
				return node;
			}
			case TokenKind.DOUBLE_COLON: {
				this.advance();
				const node = new AstNode(AstNodeKind.IDENT_EXPR, line, col);
				node.identName = this.cur.lexeme;
				node.namespaceName = '::';
				this.advance();
				return node;
			}
			case TokenKind.LPAREN: {
				this.advance();
				const expr = this.parseExpression();
				this.expect(TokenKind.RPAREN);
				return expr;
			}
			case TokenKind.LBRACE: {
				this.advance();
				const arr = new AstNode(AstNodeKind.ARRAY_LIT, line, col);
				if (!this.check(TokenKind.RBRACE)) {
					arr.arrayElements.push(this.parseExpression());
					while (this.match(TokenKind.COMMA)) {
						if (this.check(TokenKind.RBRACE)) { break; }
						arr.arrayElements.push(this.parseExpression());
					}
				}
				this.expect(TokenKind.RBRACE);
				return arr;
			}
			case TokenKind.I32: case TokenKind.I64: case TokenKind.I128:
			case TokenKind.U32: case TokenKind.U64: case TokenKind.U128:
			case TokenKind.F32: case TokenKind.F64:
			case TokenKind.BOOL: case TokenKind.CHAR: {
				const typeName = this.parseTypeName();
				if (this.check(TokenKind.STAR) && this.lexer.peekToken().kind === TokenKind.LPAREN) {
					this.advance();
					this.advance();
					const expr = this.parseExpression();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, line, col);
					node.castType = '*' + typeName;
					node.left = expr;
					return node;
				}
				if (this.check(TokenKind.LPAREN)) {
					this.advance();
					const expr = this.parseExpression();
					this.expect(TokenKind.RPAREN);
					const node = new AstNode(AstNodeKind.CAST_EXPR, line, col);
					node.castType = typeName;
					node.left = expr;
					return node;
				}
				this.error('Expected expression');
				return new AstNode(AstNodeKind.INT_LIT, line, col);
			}
			default:
				this.error(`Expected expression, got '${TokenKind[this.cur.kind]}'`);
				this.advance();
				return new AstNode(AstNodeKind.INT_LIT, line, col);
		}
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

	private parseIfStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.LPAREN);
		const cond = this.parseExpression();
		this.expect(TokenKind.RPAREN);
		const thenBody = this.parseStmt();
		const node = new AstNode(AstNodeKind.IF_STMT, line, col);
		node.condition = cond;
		node.thenBlock = thenBody || undefined;
		if (this.match(TokenKind.ELSE)) {
			node.elseBlock = this.parseStmt() || undefined;
		}
		return node;
	}

	private parseWhileStmt(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.LPAREN);
		const cond = this.parseExpression();
		this.expect(TokenKind.RPAREN);
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
			init = this.parseExpression();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.SEMICOLON)) {
			cond = this.parseExpression();
		}
		this.expect(TokenKind.SEMICOLON);
		if (!this.check(TokenKind.RPAREN)) {
			update = this.parseExpression();
		}
		this.expect(TokenKind.RPAREN);
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
			value = this.parseExpression();
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
			case TokenKind.BREAK: {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				this.expect(TokenKind.SEMICOLON);
				return new AstNode(AstNodeKind.BREAK_STMT, line, col);
			}
			case TokenKind.CONTINUE: {
				const line = this.cur.line;
				const col = this.cur.col;
				this.advance();
				this.expect(TokenKind.SEMICOLON);
				return new AstNode(AstNodeKind.CONTINUE_STMT, line, col);
			}
			case TokenKind.GOTO: {
				this.advance();
				const line = this.cur.line;
				const col = this.cur.col;
				const label = this.cur.lexeme;
				this.advance();
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
				this.advance();
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
				const expr = this.parseExpression();
				if (!expr) { return null; }
				if (this.match(TokenKind.SEMICOLON)) {
					const node = new AstNode(AstNodeKind.EXPR_STMT, expr.line, expr.col);
					node.left = expr;
					return node;
				}
				return new AstNode(AstNodeKind.RETURN_STMT, expr.line, expr.col);
			}
		}
	}

	private parseFuncDef(isStatic: boolean, isExtern: boolean = false): AstNode | null {
		const line = this.cur.line;
		const col = this.cur.col;
		const returnType = this.parseTypeName();

		let isOperator = false;
		let funcName = '';
		let opName = '';

		if (this.match(TokenKind.OPERATOR)) {
			isOperator = true;
			opName = this.cur.lexeme;
			funcName = 'operator' + opName;
			if (this.check(TokenKind.LBRACKET)) {
				this.advance();
				this.expect(TokenKind.RBRACKET);
				opName = '[]';
				funcName = 'operator[]';
			} else {
				this.advance();
			}
		} else if (this.check(TokenKind.IDENT)) {
			funcName = this.cur.lexeme;
			this.advance();
		} else if (this.check(TokenKind.LPAREN)) {
			funcName = returnType;
		} else if (this.isKeywordToken(this.cur.kind)) {
			this.error(`Keyword '${this.cur.lexeme}' cannot be used as a function name`);
			return null;
		} else {
			this.error('Expected function name');
			return null;
		}

		const node = new AstNode(AstNodeKind.FUNC_DEF, line, col);
		node.funcName = funcName;
		node.returnType = returnType;
		node.isStatic = isStatic;
		node.isOperator = isOperator;
		if (isOperator) { node.opName = opName; }

		this.expect(TokenKind.LPAREN);
		if (!this.check(TokenKind.RPAREN)) {
			do {
				if (this.match(TokenKind.VARARG)) {
					node.isVariadic = true;
					break;
				}
				const pname = this.cur.lexeme;
				this.advance();
				this.expect(TokenKind.COLON);
				const ptype = this.parseTypeName();
				let defaultVal: AstNode | undefined;
				if (this.match(TokenKind.ASSIGN)) {
					defaultVal = this.parseExpression();
				}
				node.params.push({ name: pname, typeName: ptype, defaultVal });
			} while (this.match(TokenKind.COMMA));
		}
		this.expect(TokenKind.RPAREN);

		if (this.match(TokenKind.ASSIGN)) {
			if (this.check(TokenKind.INT_LIT) && this.cur.intVal === 0) {
				node.isPureVirtual = true;
				this.advance();
			} else {
				this.error("Expected '0' after '=' for pure virtual function");
			}
		}

		if (!isOperator && !node.isPureVirtual && this.match(TokenKind.COLON)) {
			while (!this.check(TokenKind.LBRACE) && !this.check(TokenKind.SEMICOLON) && !this.check(TokenKind.EOF)) {
				if (this.check(TokenKind.IDENT)) {
					const fieldName = this.cur.lexeme;
					this.advance();
					if (this.match(TokenKind.LPAREN)) {
						const initExpr = this.parseExpression();
						this.expect(TokenKind.RPAREN);
						if (!node.initList) { node.initList = []; }
						node.initList.push({ name: fieldName, expr: initExpr });
					} else if (this.match(TokenKind.ASSIGN)) {
						const initExpr = this.parseExpression();
						if (!node.initList) { node.initList = []; }
						node.initList.push({ name: fieldName, expr: initExpr });
					} else {
						this.error(`Expected '(' or '=' after field name '${fieldName}' in initializer list`);
					}
				}
				if (!this.match(TokenKind.COMMA)) { break; }
			}
		}

		node.isExtern = isExtern;
		if (isExtern || node.isPureVirtual) {
			this.expect(TokenKind.SEMICOLON);
		} else {
			node.body = this.parseBlock();
		}
		return node;
	}

	private parseEnumDef(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		this.advance();
		this.expect(TokenKind.LBRACE);
		const node = new AstNode(AstNodeKind.ENUM_DEF, line, col);
		node.className = name;
		if (!this.check(TokenKind.RBRACE)) {
			do {
				const vname = this.cur.lexeme;
				this.advance();
				let init: AstNode | undefined;
				if (this.match(TokenKind.ASSIGN)) {
					init = this.parseExpression();
				}
				node.variants.push({ name: vname, init });
			} while (this.match(TokenKind.COMMA));
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseUnionDef(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		this.advance();
		this.expect(TokenKind.LBRACE);
		const node = new AstNode(AstNodeKind.UNION_DEF, line, col);
		node.className = name;
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const fname = this.cur.lexeme;
			this.advance();
			this.expect(TokenKind.COLON);
			const ftype = this.parseTypeName();
			this.expect(TokenKind.SEMICOLON);
			node.fields.push({ name: fname, typeName: ftype });
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseClassDef(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		this.advance();
		let baseName = '';
		let baseAccess = '';
		if (this.match(TokenKind.LPAREN)) {
			baseName = this.cur.lexeme;
			this.advance();
			if (this.match(TokenKind.COLON)) {
				if (this.check(TokenKind.PUBLIC) || this.check(TokenKind.PRIVATE) || this.check(TokenKind.PROTECTED)) {
					baseAccess = this.cur.lexeme;
					this.advance();
				}
			}
			this.expect(TokenKind.RPAREN);
		}
		this.expect(TokenKind.LBRACE);
		const node = new AstNode(AstNodeKind.CLASS_DEF, line, col);
		node.className = name;
		node.baseName = baseName;
		node.baseAccess = baseAccess;
		let curAccess = 'public';
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
				if (matchedVirtual || matchedOverride || matchedStatic) {
					if (matchedOverride && !matchedVirtual) { matchedVirtual = true; }
					const method = this.parseFuncDef(matchedStatic);
					if (method) {
						method.isVirtual = matchedVirtual;
						method.isOverride = matchedOverride;
						method.classNameForFunc = name;
						method.access = curAccess;
						if (method.funcName === name) {
							node.constructors.push(method);
						} else {
							node.methods.push(method);
						}
					}
				} else if (this.match(TokenKind.BIT_NOT)) {
					const dline = this.cur.line;
					const dcol = this.cur.col;
					const dname = this.cur.lexeme;
					this.advance();
					if (dname !== name) {
						this.error(`Destructor name '${dname}' must match class name '${name}'`);
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
					node.destructor = dtor;
				} else if (this.match(TokenKind.CLASS)) {
					this.expect(TokenKind.LBRACE);
					const nestedLine = this.cur.line;
					const nestedCol = this.cur.col;
					const nestedStmt = this.parseStmt();
					if (nestedStmt) { node.stmts.push(nestedStmt); }
				} else if (this.isTypeToken(this.cur.kind)) {
					if (this.check(TokenKind.IDENT) && this.lexer.peekToken().kind === TokenKind.COLON) {
						const fname = this.cur.lexeme;
						this.advance();
						this.expect(TokenKind.COLON);
						const ftype = this.parseTypeName();
						let init: AstNode | undefined;
						if (this.match(TokenKind.ASSIGN)) {
							init = this.parseExpression();
						}
						this.expect(TokenKind.SEMICOLON);
						node.fields.push({ name: fname, typeName: ftype, init, access: curAccess });
					} else {
						const method = this.parseFuncDef(false);
						if (method) {
							method.classNameForFunc = name;
							method.access = curAccess;
							if (method.funcName === name) {
								node.constructors.push(method);
							} else {
								node.methods.push(method);
							}
						}
					}
				} else if (this.isKeywordToken(this.cur.kind)) {
					this.error(`Keyword '${this.cur.lexeme}' cannot be used as a class member name`);
					this.advance();
				} else {
					this.error(`Expected field, method, or access specifier in class '${name}'`);
					this.advance();
				}
			}
		}
		this.expect(TokenKind.RBRACE);
		this.match(TokenKind.SEMICOLON);
		return node;
	}

	private parseNamespaceDef(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		const name = this.cur.lexeme;
		this.advance();
		const node = new AstNode(AstNodeKind.NAMESPACE_DEF, line, col);
		node.className = name;
		this.expect(TokenKind.LBRACE);
		while (!this.check(TokenKind.RBRACE) && !this.check(TokenKind.EOF)) {
			const decl = this.parseDecl();
			if (decl) { node.stmts.push(decl); }
		}
		this.expect(TokenKind.RBRACE);
		return node;
	}

	private parseTemplateDef(): AstNode {
		const line = this.cur.line;
		const col = this.cur.col;
		this.advance();
		this.expect(TokenKind.DOLLAR);
		const node = new AstNode(AstNodeKind.TEMPLATE_DEF, line, col);
		do {
			const tpName = this.cur.lexeme;
			this.advance();
			const tp: TemplateParam = { name: tpName, isType: true };
			if (this.match(TokenKind.COLON)) {
				if (this.match(TokenKind.TYPENAME)) {
					tp.isType = true;
				} else {
					tp.typeName = this.parseTypeName();
					tp.isType = false;
				}
			} else {
				tp.isType = true;
			}
			node.templateParams.push(tp);
		} while (this.match(TokenKind.COMMA));
		this.expect(TokenKind.DOLLAR);
		const body = this.parseDecl();
		if (body) {
			node.templateBody = body;
		}
		return node;
	}
}