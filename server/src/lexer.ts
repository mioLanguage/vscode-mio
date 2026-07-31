import { Token, TokenKind } from './ast';

const KEYWORDS: Record<string, TokenKind> = {
	'import': TokenKind.IMPORT, 'extern': TokenKind.EXTERN,
	'var': TokenKind.VAR, 'const': TokenKind.CONST,
	'if': TokenKind.IF, 'else': TokenKind.ELSE, 'elif': TokenKind.ELIF,
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
	'this': TokenKind.THIS, 'macro': TokenKind.MACRO,
	'template': TokenKind.TEMPLATE, 'typename': TokenKind.TYPENAME,
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
};

export class Lexer {
	private source: string;
	private pos: number = 0;
	private line: number = 1;
	private col: number = 1;
	private tokens: Token[] = [];
	private tokenPos: number = 0;

	constructor(source: string) {
		this.source = source;
		this.tokenize();
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

	private readIdent(): Token {
		const startLine = this.line;
		const startCol = this.col;
		let text = '';
		while (this.isAlnum(this.cur())) {
			text += this.advance();
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
		this.advance(); // skip opening "
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
		this.advance(); // skip opening '
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
		this.advance(); // skip @
		let text = '';
		while (this.isAlnum(this.cur())) {
			text += this.advance();
		}
		const kind = AT_DIRECTIVES[text];
		if (kind !== undefined) {
			return new Token(kind, '@' + text, startLine, startCol);
		}
		return new Token(TokenKind.ERROR, '@' + text, startLine, startCol);
	}

	private tokenize(): void {
		while (true) {
			this.skipWhitespace();
			if (this.cur() === '\0') {
				this.tokens.push(new Token(TokenKind.EOF, '', this.line, this.col));
				break;
			}

			const startLine = this.line;
			const startCol = this.col;
			const c = this.advance();

			if (this.isAlpha(c)) {
				this.pos--;
				this.col--;
				this.tokens.push(this.readIdent());
				continue;
			}

			if (this.isDigit(c)) {
				this.pos--;
				this.col--;
				this.tokens.push(this.readNumber());
				continue;
			}

			switch (c) {
				case '"': this.pos--; this.col--; this.tokens.push(this.readString()); break;
				case '\'': this.pos--; this.col--; this.tokens.push(this.readChar()); break;
				case '@': this.pos--; this.col--; this.tokens.push(this.readAtDirective()); break;
				case '+': this.tokens.push(new Token(TokenKind.PLUS, '+', startLine, startCol)); break;
				case '-':
					if (this.cur() === '>') {
						this.advance();
						this.tokens.push(new Token(TokenKind.ARROW, '->', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.MINUS, '-', startLine, startCol));
					}
					break;
				case '*': this.tokens.push(new Token(TokenKind.STAR, '*', startLine, startCol)); break;
				case '/': this.tokens.push(new Token(TokenKind.SLASH, '/', startLine, startCol)); break;
				case '%': this.tokens.push(new Token(TokenKind.PERCENT, '%', startLine, startCol)); break;
				case '(': this.tokens.push(new Token(TokenKind.LPAREN, '(', startLine, startCol)); break;
				case ')': this.tokens.push(new Token(TokenKind.RPAREN, ')', startLine, startCol)); break;
				case '{': this.tokens.push(new Token(TokenKind.LBRACE, '{', startLine, startCol)); break;
				case '}': this.tokens.push(new Token(TokenKind.RBRACE, '}', startLine, startCol)); break;
				case '[': this.tokens.push(new Token(TokenKind.LBRACKET, '[', startLine, startCol)); break;
				case ']': this.tokens.push(new Token(TokenKind.RBRACKET, ']', startLine, startCol)); break;
				case ';': this.tokens.push(new Token(TokenKind.SEMICOLON, ';', startLine, startCol)); break;
				case ':':
					if (this.cur() === ':') {
						this.advance();
						this.tokens.push(new Token(TokenKind.DOUBLE_COLON, '::', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.COLON, ':', startLine, startCol));
					}
					break;
				case ',': this.tokens.push(new Token(TokenKind.COMMA, ',', startLine, startCol)); break;
				case '.':
					if (this.cur() === '.' && this.peek(1) === '.') {
						this.advance();
						this.advance();
						this.tokens.push(new Token(TokenKind.VARARG, '...', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.DOT, '.', startLine, startCol));
					}
					break;
				case '=':
					if (this.cur() === '=') {
						this.advance();
						this.tokens.push(new Token(TokenKind.EQ, '==', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.ASSIGN, '=', startLine, startCol));
					}
					break;
				case '!':
					if (this.cur() === '=') {
						this.advance();
						this.tokens.push(new Token(TokenKind.NEQ, '!=', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.NOT, '!', startLine, startCol));
					}
					break;
				case '<':
					if (this.cur() === '=') {
						this.advance();
						this.tokens.push(new Token(TokenKind.LTE, '<=', startLine, startCol));
					} else if (this.cur() === '<') {
						this.advance();
						this.tokens.push(new Token(TokenKind.LSHIFT, '<<', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.LT, '<', startLine, startCol));
					}
					break;
				case '>':
					if (this.cur() === '=') {
						this.advance();
						this.tokens.push(new Token(TokenKind.GTE, '>=', startLine, startCol));
					} else if (this.cur() === '>') {
						this.advance();
						this.tokens.push(new Token(TokenKind.RSHIFT, '>>', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.GT, '>', startLine, startCol));
					}
					break;
				case '&':
					if (this.cur() === '&') {
						this.advance();
						this.tokens.push(new Token(TokenKind.AND, '&&', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.BIT_AND, '&', startLine, startCol));
					}
					break;
				case '|':
					if (this.cur() === '|') {
						this.advance();
						this.tokens.push(new Token(TokenKind.OR, '||', startLine, startCol));
					} else {
						this.tokens.push(new Token(TokenKind.BIT_OR, '|', startLine, startCol));
					}
					break;
				case '^': this.tokens.push(new Token(TokenKind.BIT_XOR, '^', startLine, startCol)); break;
				case '~': this.tokens.push(new Token(TokenKind.BIT_NOT, '~', startLine, startCol)); break;
				default:
					this.tokens.push(new Token(TokenKind.ERROR, c, startLine, startCol));
					break;
			}
		}
	}

	peekToken(): Token {
		if (this.tokenPos < this.tokens.length) {
			return this.tokens[this.tokenPos];
		}
		return this.tokens[this.tokens.length - 1];
	}

	nextToken(): Token {
		if (this.tokenPos < this.tokens.length) {
			return this.tokens[this.tokenPos++];
		}
		return this.tokens[this.tokens.length - 1];
	}

	getAllTokens(): Token[] {
		return this.tokens;
	}
}