import { Token, TokenKind } from './ast';

const KEYWORDS: Record<string, TokenKind> = {
	'import': TokenKind.IMPORT, 'extern': TokenKind.EXTERN,
	'var': TokenKind.VAR, 'const': TokenKind.CONST,
	'if': TokenKind.IF, 'else': TokenKind.ELSE,
	'while': TokenKind.WHILE, 'for': TokenKind.FOR,
	'break': TokenKind.BREAK, 'continue': TokenKind.CONTINUE,
	'goto': TokenKind.GOTO, 'return': TokenKind.RETURN,
	'enum': TokenKind.ENUM,
	'union': TokenKind.UNION, 'class': TokenKind.CLASS,
	'namespace': TokenKind.NAMESPACE,
	'public': TokenKind.PUBLIC, 'private': TokenKind.PRIVATE,
	'protected': TokenKind.PROTECTED,
	'virtual': TokenKind.VIRTUAL, 'override': TokenKind.OVERRIDE,
	'static': TokenKind.STATIC, 'operator': TokenKind.OPERATOR,
	'true': TokenKind.TRUE, 'false': TokenKind.FALSE,
	'this': TokenKind.THIS,
	'template': TokenKind.TEMPLATE, 'typename': TokenKind.TYPENAME,
	'sizeof': TokenKind.SIZEOF,
	'i8': TokenKind.I8, 'i16': TokenKind.I16, 'i32': TokenKind.I32,
	'i64': TokenKind.I64, 'i128': TokenKind.I128,
	'u8': TokenKind.U8, 'u16': TokenKind.U16, 'u32': TokenKind.U32,
	'u64': TokenKind.U64, 'u128': TokenKind.U128,
	'usize': TokenKind.USIZE, 'isize': TokenKind.ISIZE,
	'f32': TokenKind.F32, 'f64': TokenKind.F64,
	'bool': TokenKind.BOOL, 'char': TokenKind.CHAR, 'void': TokenKind.VOID,
};

const AT_DIRECTIVES: Record<string, TokenKind> = {
	'if': TokenKind.AT_IF, 'elif': TokenKind.AT_ELIF,
	'else': TokenKind.AT_ELSE, 'end': TokenKind.AT_END,
	'macro': TokenKind.AT_MACRO,
};

interface CondState {
	in_true_branch: boolean;
	skipping: boolean;
	has_else: boolean;
	skipStartLine: number;
	skipStartCol: number;
}

export interface SkippedRange {
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
}

export class Lexer {
	private source: string;
	private pos: number = 0;
	private line: number = 1;
	private col: number = 1;
	private bol: number = 0;
	private tokens: Token[] = [];
	private tokenPos: number = 0;
	private macros: Map<string, string> = new Map();
	private condStack: CondState[] = [];
	public skippedRanges: { startLine: number; startCol: number; endLine: number; endCol: number }[] = [];
	public errors: string[] = [];

	constructor(source: string) {
		this.source = source;
		this.collectMacros();
		this.tokenize();
	}

	private collectMacros(): void {
		const savedPos = this.pos;
		const savedLine = this.line;
		const savedCol = this.col;
		while (this.pos < this.source.length) {
			this.skipWhitespace();
			if (this.cur() === '@') {
				const start = this.pos;
				this.advance();
				let directive = '';
				while (this.isAlnum(this.cur())) {
					directive += this.advance();
				}
				if (directive === 'macro') {
					while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') { this.advance(); }
					if (this.cur() !== '\0' && this.cur() !== '\n' && this.isAlpha(this.cur())) {
						let name = '';
						while (this.isAlnum(this.cur())) {
							name += this.advance();
						}
						while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') { this.advance(); }
						let value = '1';
						if (this.cur() !== '\0' && this.cur() !== '\n') {
							const vstart = this.pos;
							if (this.isAlpha(this.cur())) {
								while (this.isAlnum(this.cur())) { this.advance(); }
							} else if (this.isDigit(this.cur())) {
								while (this.isDigit(this.cur()) || this.cur() === '.') { this.advance(); }
							} else if (this.cur() === '"') {
								this.advance();
								while (this.cur() !== '"' && this.cur() !== '\0' && this.cur() !== '\n') { this.advance(); }
								if (this.cur() === '"') { this.advance(); }
							}
							const vlen = this.pos - vstart;
							if (vlen > 0) {
								value = this.source.substring(vstart, vstart + vlen);
							}
						}
						if (!this.macros.has(name)) {
							this.macros.set(name, value);
						}
					}
				}
			}
			if (this.cur() !== '\n' && this.cur() !== '\0') {
				while (this.cur() !== '\n' && this.cur() !== '\0') { this.advance(); }
			}
			if (this.cur() === '\n') { this.advance(); }
		}
		this.pos = savedPos;
		this.line = savedLine;
		this.col = savedCol;
	}

	get peekToken(): Token {
		if (this.tokenPos < this.tokens.length) {
			return this.tokens[this.tokenPos];
		}
		return this.tokens[this.tokens.length - 1];
	}

	getAllTokens(): Token[] {
		return this.tokens;
	}

	nextToken(): Token {
		if (this.tokenPos < this.tokens.length) {
			return this.tokens[this.tokenPos++];
		}
		return this.tokens[this.tokens.length - 1];
	}

	isTemplateInstantiation(): boolean {
		const savedPos = this.tokenPos;
		if (this.tokenPos >= this.tokens.length) {
			return false;
		}
		const t1 = this.tokens[this.tokenPos];
		if (t1.kind !== TokenKind.DOLLAR) {
			return false;
		}
		if (this.tokenPos + 1 >= this.tokens.length) {
			return false;
		}
		const t2 = this.tokens[this.tokenPos + 1];
		return t2.kind === TokenKind.LPAREN;
	}

	private cur(): string {
		return this.pos < this.source.length ? this.source[this.pos] : '\0';
	}

	private advance(): string {
		const c = this.cur();
		if (c === '\0') { return c; }
		this.pos++;
		if (c === '\n') {
			this.line++;
			this.col = 1;
			this.bol = this.pos;
		} else {
			this.col++;
		}
		return c;
	}

	private peek(n: number = 0): string {
		const i = this.pos + n;
		return i < this.source.length ? this.source[i] : '\0';
	}

	private skipWhitespace(): void {
		while (true) {
			const c = this.cur();
			switch (c) {
				case ' ':
				case '\t':
				case '\r':
				case '\n':
					this.advance();
					break;
				case '#':
					while (this.cur() !== '\n' && this.cur() !== '\0') {
						this.advance();
					}
					break;
				case '/':
					return;
				default:
					return;
			}
		}
	}

	private isAlpha(c: string): boolean {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
	}

	private isDigit(c: string): boolean {
		return c >= '0' && c <= '9';
	}

	private isAlnum(c: string): boolean {
		return this.isAlpha(c) || this.isDigit(c);
	}

	private isHexDigit(c: string): boolean {
		return this.isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
	}

	private isMacroDefined(name: string): boolean {
		return this.macros.has(name);
	}

	private addMacro(name: string, value: string): void {
		if (this.macros.has(name)) {
			this.errors.push(`macro '${name}' is already defined`);
			return;
		}
		this.macros.set(name, value);
	}

	private readIdent(): Token {
		const startLine = this.line;
		const startCol = this.col;
		let text = '';
		while (this.isAlnum(this.cur())) {
			text += this.advance();
		}
		if (text === 'macro') {
			return new Token(TokenKind.ERROR, "'macro' is only allowed in conditional compilation context", startLine, startCol);
		}
		const kw = KEYWORDS[text];
		if (kw !== undefined) {
			return new Token(kw, text, startLine, startCol);
		}
		return new Token(TokenKind.IDENT, text, startLine, startCol);
	}

	private readNumber(): Token {
		const startLine = this.line;
		const startCol = this.col;
		let text = '';
		let isFloat = false;

		if (this.cur() === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
			text += this.advance();
			text += this.advance();
			while (this.isHexDigit(this.cur())) {
				text += this.advance();
			}
		} else {
			while (this.isDigit(this.cur())) {
				text += this.advance();
			}
			if (this.cur() === '.') {
				isFloat = true;
				text += this.advance();
				while (this.isDigit(this.cur())) {
					text += this.advance();
				}
			}
		}

		const token = new Token(
			isFloat ? TokenKind.FLOAT_LIT : TokenKind.INT_LIT,
			text, startLine, startCol
		);
		if (isFloat) {
			token.floatVal = parseFloat(text);
		} else {
			token.intVal = text.startsWith('0x') || text.startsWith('0X')
				? parseInt(text, 16) : parseInt(text, 10);
		}
		return token;
	}

	private readString(): Token {
		const startLine = this.line;
		const startCol = this.col;
		this.advance();
		let text = '';
		while (this.cur() !== '"' && this.cur() !== '\0') {
			if (this.cur() === '\\') {
				this.advance();
				switch (this.cur()) {
					case 'n': text += '\n'; break;
					case 't': text += '\t'; break;
					case 'r': text += '\r'; break;
					case '\\': text += '\\'; break;
					case '"': text += '"'; break;
					case '0': text += '\0'; break;
					default: text += this.cur(); break;
				}
				this.advance();
			} else {
				text += this.advance();
			}
		}
		if (this.cur() === '"') { this.advance(); }
		const token = new Token(TokenKind.STRING_LIT, text, startLine, startCol);
		token.stringVal = text;
		return token;
	}

	private readChar(): Token {
		const startLine = this.line;
		const startCol = this.col;
		this.advance();
		let c: string;
		if (this.cur() === '\\') {
			this.advance();
			switch (this.cur()) {
				case 'n': c = '\n'; break;
				case 't': c = '\t'; break;
				case 'r': c = '\r'; break;
				case '\\': c = '\\'; break;
				case '\'': c = '\''; break;
				case '0': c = '\0'; break;
				default: c = this.cur(); break;
			}
			this.advance();
		} else {
			c = this.advance();
		}
		if (this.cur() === '\'') { this.advance(); }
		const token = new Token(TokenKind.CHAR_LIT, c, startLine, startCol);
		token.charVal = c;
		return token;
	}

	private readAtDirective(): Token {
		const startLine = this.line;
		const startCol = this.col;
		this.advance();
		let text = '';
		while (this.isAlnum(this.cur())) {
			text += this.advance();
		}
		const kind = AT_DIRECTIVES[text];
		if (kind !== undefined) {
			return new Token(kind, '@' + text, startLine, startCol);
		}
		return new Token(TokenKind.ERROR, "unknown directive '@" + text + "'", startLine, startCol);
	}

	private preprocessToken(): Token {
		while (true) {
			const t = this.rawToken();
			switch (t.kind) {
				case TokenKind.AT_IF: {
					let negate = false;
					let next = this.rawToken();
					if (next.kind === TokenKind.NOT) {
						negate = true;
						next = this.rawToken();
					}
					let defined = false;
					if (next.kind === TokenKind.IDENT) {
						defined = this.isMacroDefined(next.lexeme);
					}
					const result = negate ? !defined : defined;
					if (result) {
						this.condStack.push({ in_true_branch: true, skipping: false, has_else: false, skipStartLine: 0, skipStartCol: 0 });
					} else {
						this.condStack.push({ in_true_branch: false, skipping: true, has_else: false, skipStartLine: 0, skipStartCol: 0 });
					}
					continue;
				}
				case TokenKind.AT_ELIF: {
					if (this.condStack.length === 0) {
						this.errors.push(`Line ${t.line}:${t.col}: stray '@elif' outside of conditional compilation block`);
						const next = this.rawToken();
						if (next.kind === TokenKind.NOT) { /* consume */ }
						else { /* already consumed */ }
						continue;
					}
					const state = this.condStack[this.condStack.length - 1];
					if (state.has_else) {
						this.errors.push(`Line ${t.line}:${t.col}: '@elif' after '@else'`);
						const next = this.rawToken();
						if (next.kind === TokenKind.NOT) { /* consume */ }
						continue;
					}
					if (state.in_true_branch) {
						state.skipping = true;
						state.skipStartLine = 0;
						state.skipStartCol = 0;
					} else {
						if (state.skipStartLine > 0) {
							this.skippedRanges.push({
								startLine: state.skipStartLine,
								startCol: state.skipStartCol,
								endLine: t.line,
								endCol: t.col + t.lexeme.length - 1,
							});
							state.skipStartLine = 0;
						}
						let negate = false;
						let next = this.rawToken();
						if (next.kind === TokenKind.NOT) {
							negate = true;
							next = this.rawToken();
						}
						let defined = false;
						if (next.kind === TokenKind.IDENT) {
							defined = this.isMacroDefined(next.lexeme);
						}
						const result = negate ? !defined : defined;
						if (result) {
							state.in_true_branch = true;
							state.skipping = false;
						}
					}
					continue;
				}
				case TokenKind.AT_ELSE: {
					if (this.condStack.length === 0) {
						this.errors.push(`Line ${t.line}:${t.col}: stray '@else' outside of conditional compilation block`);
						continue;
					}
					const state = this.condStack[this.condStack.length - 1];
					if (state.has_else) {
						this.errors.push(`Line ${t.line}:${t.col}: duplicate '@else'`);
						continue;
					}
					state.has_else = true;
					if (state.in_true_branch) {
						state.skipping = true;
						state.skipStartLine = 0;
						state.skipStartCol = 0;
					} else {
						if (state.skipStartLine > 0) {
							this.skippedRanges.push({
								startLine: state.skipStartLine,
								startCol: state.skipStartCol,
								endLine: t.line,
								endCol: t.col + t.lexeme.length - 1,
							});
							state.skipStartLine = 0;
						}
						state.in_true_branch = true;
						state.skipping = false;
					}
					continue;
				}
				case TokenKind.AT_END: {
					if (this.condStack.length === 0) {
						this.errors.push(`Line ${t.line}:${t.col}: stray '@end' outside of conditional compilation block`);
						continue;
					}
					const state = this.condStack.pop()!;
					if (state.skipping && state.skipStartLine > 0) {
						this.skippedRanges.push({
							startLine: state.skipStartLine,
							startCol: state.skipStartCol,
							endLine: t.line,
							endCol: t.col + t.lexeme.length - 1,
						});
					}
					continue;
				}
				case TokenKind.AT_MACRO: {
					const atLine = t.line;
					const atCol = t.col;
					while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') { this.advance(); }
					if (this.cur() === '\0' || this.cur() === '\n') {
						this.errors.push(`Line ${atLine}:${atCol}: expected macro name after '@macro'`);
						continue;
					}
					if (!this.isAlpha(this.cur())) {
						this.errors.push(`Line ${atLine}:${atCol}: expected macro name after '@macro'`);
						continue;
					}
					let name = '';
					while (this.isAlnum(this.cur())) {
						name += this.advance();
					}
					while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') { this.advance(); }
					let value = '1';
					if (this.cur() !== '\0' && this.cur() !== '\n') {
						const valStart = this.pos;
						if (this.isAlpha(this.cur())) {
							while (this.isAlnum(this.cur())) { this.advance(); }
						} else if (this.isDigit(this.cur())) {
							while (this.isDigit(this.cur()) || this.cur() === '.') { this.advance(); }
						} else if (this.cur() === '"') {
							this.advance();
							while (this.cur() !== '"' && this.cur() !== '\0' && this.cur() !== '\n') { this.advance(); }
							if (this.cur() === '"') { this.advance(); }
						}
						const valLen = this.pos - valStart;
						if (valLen > 0) {
							value = this.source.substring(valStart, valStart + valLen);
						}
					}
					this.addMacro(name, value);
					continue;
				}
				case TokenKind.EOF: {
					if (this.condStack.length > 0) {
						this.errors.push(`Line ${t.line}:${t.col}: unclosed '@if' (expected '@end')`);
						this.condStack.length = 0;
					}
					return t;
				}
				default:
					if (this.condStack.length > 0 && this.condStack[this.condStack.length - 1].skipping) {
						const state = this.condStack[this.condStack.length - 1];
						if (state.skipStartLine === 0) {
							state.skipStartLine = t.line;
							state.skipStartCol = t.col;
						}
						continue;
					}
					return t;
			}
		}
	}

	private rawToken(): Token {
		this.skipWhitespace();
		if (this.cur() === '\0') {
			return new Token(TokenKind.EOF, '', this.line, this.col);
		}

		const startLine = this.line;
		const startCol = this.col;
		const c = this.advance();

		if (this.isAlpha(c)) {
			this.pos--;
			this.col--;
			return this.readIdent();
		}

		if (this.isDigit(c)) {
			this.pos--;
			this.col--;
			return this.readNumber();
		}

		switch (c) {
			case '"': this.pos--; this.col--; return this.readString();
			case '\'': this.pos--; this.col--; return this.readChar();
			case '@':
				this.pos--;
				this.col--;
				return this.readAtDirective();
			case '+':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.PLUS_ASSIGN, '+=', startLine, startCol);
				}
				return new Token(TokenKind.PLUS, '+', startLine, startCol);
			case '-':
				if (this.cur() === '>') {
					this.advance();
					return new Token(TokenKind.ARROW, '->', startLine, startCol);
				} else if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.MINUS_ASSIGN, '-=', startLine, startCol);
				}
				return new Token(TokenKind.MINUS, '-', startLine, startCol);
			case '*':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.STAR_ASSIGN, '*=', startLine, startCol);
				}
				return new Token(TokenKind.STAR, '*', startLine, startCol);
			case '/':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.SLASH_ASSIGN, '/=', startLine, startCol);
				}
				return new Token(TokenKind.SLASH, '/', startLine, startCol);
			case '%':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.PERCENT_ASSIGN, '%=', startLine, startCol);
				}
				return new Token(TokenKind.PERCENT, '%', startLine, startCol);
			case '(': return new Token(TokenKind.LPAREN, '(', startLine, startCol);
			case ')': return new Token(TokenKind.RPAREN, ')', startLine, startCol);
			case '{': return new Token(TokenKind.LBRACE, '{', startLine, startCol);
			case '}': return new Token(TokenKind.RBRACE, '}', startLine, startCol);
			case '[': return new Token(TokenKind.LBRACKET, '[', startLine, startCol);
			case ']': return new Token(TokenKind.RBRACKET, ']', startLine, startCol);
			case ';': return new Token(TokenKind.SEMICOLON, ';', startLine, startCol);
			case ':':
				if (this.cur() === ':') {
					this.advance();
					return new Token(TokenKind.DOUBLE_COLON, '::', startLine, startCol);
				}
				return new Token(TokenKind.COLON, ':', startLine, startCol);
			case ',': return new Token(TokenKind.COMMA, ',', startLine, startCol);
			case '.':
				if (this.cur() === '.' && this.peek(1) === '.') {
					this.advance();
					this.advance();
					return new Token(TokenKind.VARARG, '...', startLine, startCol);
				}
				return new Token(TokenKind.DOT, '.', startLine, startCol);
			case '=':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.EQ, '==', startLine, startCol);
				}
				return new Token(TokenKind.ASSIGN, '=', startLine, startCol);
			case '!':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.NEQ, '!=', startLine, startCol);
				}
				return new Token(TokenKind.NOT, '!', startLine, startCol);
			case '<':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.LTE, '<=', startLine, startCol);
				} else if (this.cur() === '<') {
					this.advance();
					if (this.cur() === '=') {
						this.advance();
						return new Token(TokenKind.LSHIFT_ASSIGN, '<<=', startLine, startCol);
					}
					return new Token(TokenKind.LSHIFT, '<<', startLine, startCol);
				}
				return new Token(TokenKind.LT, '<', startLine, startCol);
			case '>':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.GTE, '>=', startLine, startCol);
				} else if (this.cur() === '>') {
					this.advance();
					if (this.cur() === '=') {
						this.advance();
						return new Token(TokenKind.RSHIFT_ASSIGN, '>>=', startLine, startCol);
					}
					return new Token(TokenKind.RSHIFT, '>>', startLine, startCol);
				}
				return new Token(TokenKind.GT, '>', startLine, startCol);
			case '&':
				if (this.cur() === '&') {
					this.advance();
					return new Token(TokenKind.AND, '&&', startLine, startCol);
				} else if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.AND_ASSIGN, '&=', startLine, startCol);
				}
				return new Token(TokenKind.BIT_AND, '&', startLine, startCol);
			case '|':
				if (this.cur() === '|') {
					this.advance();
					return new Token(TokenKind.OR, '||', startLine, startCol);
				} else if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.OR_ASSIGN, '|=', startLine, startCol);
				}
				return new Token(TokenKind.BIT_OR, '|', startLine, startCol);
			case '^':
				if (this.cur() === '=') {
					this.advance();
					return new Token(TokenKind.XOR_ASSIGN, '^=', startLine, startCol);
				}
				return new Token(TokenKind.BIT_XOR, '^', startLine, startCol);
			case '~': return new Token(TokenKind.BIT_NOT, '~', startLine, startCol);
			case '$': return new Token(TokenKind.DOLLAR, '$', startLine, startCol);
			default:
				return new Token(TokenKind.ERROR, "unexpected character '" + c + "'", startLine, startCol);
		}
	}

	private tokenize(): void {
		while (true) {
			const t = this.preprocessToken();
			this.tokens.push(t);
			if (t.kind === TokenKind.EOF) {
				break;
			}
		}
	}
}