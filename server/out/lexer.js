"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
const ast_1 = require("./ast");
const KEYWORDS = {
    'import': ast_1.TokenKind.IMPORT, 'extern': ast_1.TokenKind.EXTERN,
    'var': ast_1.TokenKind.VAR, 'const': ast_1.TokenKind.CONST,
    'if': ast_1.TokenKind.IF, 'else': ast_1.TokenKind.ELSE, 'elif': ast_1.TokenKind.ELIF,
    'while': ast_1.TokenKind.WHILE, 'for': ast_1.TokenKind.FOR,
    'break': ast_1.TokenKind.BREAK, 'continue': ast_1.TokenKind.CONTINUE,
    'goto': ast_1.TokenKind.GOTO, 'return': ast_1.TokenKind.RETURN,
    'enum': ast_1.TokenKind.ENUM,
    'union': ast_1.TokenKind.UNION, 'class': ast_1.TokenKind.CLASS,
    'namespace': ast_1.TokenKind.NAMESPACE,
    'public': ast_1.TokenKind.PUBLIC, 'private': ast_1.TokenKind.PRIVATE,
    'protected': ast_1.TokenKind.PROTECTED,
    'virtual': ast_1.TokenKind.VIRTUAL, 'override': ast_1.TokenKind.OVERRIDE,
    'static': ast_1.TokenKind.STATIC, 'operator': ast_1.TokenKind.OPERATOR,
    'true': ast_1.TokenKind.TRUE, 'false': ast_1.TokenKind.FALSE,
    'this': ast_1.TokenKind.THIS, 'macro': ast_1.TokenKind.MACRO,
    'template': ast_1.TokenKind.TEMPLATE, 'typename': ast_1.TokenKind.TYPENAME,
    'i8': ast_1.TokenKind.I8, 'i16': ast_1.TokenKind.I16, 'i32': ast_1.TokenKind.I32,
    'i64': ast_1.TokenKind.I64, 'i128': ast_1.TokenKind.I128,
    'u8': ast_1.TokenKind.U8, 'u16': ast_1.TokenKind.U16, 'u32': ast_1.TokenKind.U32,
    'u64': ast_1.TokenKind.U64, 'u128': ast_1.TokenKind.U128,
    'usize': ast_1.TokenKind.USIZE, 'isize': ast_1.TokenKind.ISIZE,
    'f32': ast_1.TokenKind.F32, 'f64': ast_1.TokenKind.F64,
    'bool': ast_1.TokenKind.BOOL, 'char': ast_1.TokenKind.CHAR, 'void': ast_1.TokenKind.VOID,
};
const AT_DIRECTIVES = {
    'if': ast_1.TokenKind.AT_IF, 'elif': ast_1.TokenKind.AT_ELIF,
    'else': ast_1.TokenKind.AT_ELSE, 'end': ast_1.TokenKind.AT_END,
};
class Lexer {
    constructor(source) {
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
        this.tokenPos = 0;
        this.source = source;
        this.tokenize();
    }
    cur() {
        return this.pos < this.source.length ? this.source[this.pos] : '\0';
    }
    advance() {
        const c = this.cur();
        if (c === '\0') {
            return c;
        }
        this.pos++;
        if (c === '\n') {
            this.line++;
            this.col = 1;
        }
        else {
            this.col++;
        }
        return c;
    }
    peek(n = 0) {
        const i = this.pos + n;
        return i < this.source.length ? this.source[i] : '\0';
    }
    skipWhitespace() {
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
    isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }
    isDigit(c) {
        return c >= '0' && c <= '9';
    }
    isAlnum(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }
    isHexDigit(c) {
        return this.isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
    }
    readIdent() {
        const startLine = this.line;
        const startCol = this.col;
        let text = '';
        while (this.isAlnum(this.cur())) {
            text += this.advance();
        }
        const kw = KEYWORDS[text];
        if (kw !== undefined) {
            return new ast_1.Token(kw, text, startLine, startCol);
        }
        return new ast_1.Token(ast_1.TokenKind.IDENT, text, startLine, startCol);
    }
    readNumber() {
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
        }
        else {
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
        const token = new ast_1.Token(isFloat ? ast_1.TokenKind.FLOAT_LIT : ast_1.TokenKind.INT_LIT, text, startLine, startCol);
        if (isFloat) {
            token.floatVal = parseFloat(text);
        }
        else {
            token.intVal = text.startsWith('0x') || text.startsWith('0X')
                ? parseInt(text, 16) : parseInt(text, 10);
        }
        return token;
    }
    readString() {
        const startLine = this.line;
        const startCol = this.col;
        this.advance(); // skip opening "
        let text = '';
        while (this.cur() !== '"' && this.cur() !== '\0') {
            if (this.cur() === '\\') {
                this.advance();
                switch (this.cur()) {
                    case 'n':
                        text += '\n';
                        break;
                    case 't':
                        text += '\t';
                        break;
                    case 'r':
                        text += '\r';
                        break;
                    case '\\':
                        text += '\\';
                        break;
                    case '"':
                        text += '"';
                        break;
                    case '0':
                        text += '\0';
                        break;
                    default:
                        text += this.cur();
                        break;
                }
                this.advance();
            }
            else {
                text += this.advance();
            }
        }
        if (this.cur() === '"') {
            this.advance();
        }
        const token = new ast_1.Token(ast_1.TokenKind.STRING_LIT, text, startLine, startCol);
        token.stringVal = text;
        return token;
    }
    readChar() {
        const startLine = this.line;
        const startCol = this.col;
        this.advance(); // skip opening '
        let c;
        if (this.cur() === '\\') {
            this.advance();
            switch (this.cur()) {
                case 'n':
                    c = '\n';
                    break;
                case 't':
                    c = '\t';
                    break;
                case 'r':
                    c = '\r';
                    break;
                case '\\':
                    c = '\\';
                    break;
                case '\'':
                    c = '\'';
                    break;
                case '0':
                    c = '\0';
                    break;
                default:
                    c = this.cur();
                    break;
            }
            this.advance();
        }
        else {
            c = this.advance();
        }
        if (this.cur() === '\'') {
            this.advance();
        }
        const token = new ast_1.Token(ast_1.TokenKind.CHAR_LIT, c, startLine, startCol);
        token.charVal = c;
        return token;
    }
    readAtDirective() {
        const startLine = this.line;
        const startCol = this.col;
        this.advance(); // skip @
        let text = '';
        while (this.isAlnum(this.cur())) {
            text += this.advance();
        }
        const kind = AT_DIRECTIVES[text];
        if (kind !== undefined) {
            return new ast_1.Token(kind, '@' + text, startLine, startCol);
        }
        return new ast_1.Token(ast_1.TokenKind.ERROR, '@' + text, startLine, startCol);
    }
    tokenize() {
        while (true) {
            this.skipWhitespace();
            if (this.cur() === '\0') {
                this.tokens.push(new ast_1.Token(ast_1.TokenKind.EOF, '', this.line, this.col));
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
                case '"':
                    this.pos--;
                    this.col--;
                    this.tokens.push(this.readString());
                    break;
                case '\'':
                    this.pos--;
                    this.col--;
                    this.tokens.push(this.readChar());
                    break;
                case '@':
                    this.pos--;
                    this.col--;
                    this.tokens.push(this.readAtDirective());
                    break;
                case '+':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.PLUS, '+', startLine, startCol));
                    break;
                case '-':
                    if (this.cur() === '>') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.ARROW, '->', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.MINUS, '-', startLine, startCol));
                    }
                    break;
                case '*':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.STAR, '*', startLine, startCol));
                    break;
                case '/':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.SLASH, '/', startLine, startCol));
                    break;
                case '%':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.PERCENT, '%', startLine, startCol));
                    break;
                case '(':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.LPAREN, '(', startLine, startCol));
                    break;
                case ')':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.RPAREN, ')', startLine, startCol));
                    break;
                case '{':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.LBRACE, '{', startLine, startCol));
                    break;
                case '}':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.RBRACE, '}', startLine, startCol));
                    break;
                case '[':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.LBRACKET, '[', startLine, startCol));
                    break;
                case ']':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.RBRACKET, ']', startLine, startCol));
                    break;
                case ';':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.SEMICOLON, ';', startLine, startCol));
                    break;
                case ':':
                    if (this.cur() === ':') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.DOUBLE_COLON, '::', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.COLON, ':', startLine, startCol));
                    }
                    break;
                case ',':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.COMMA, ',', startLine, startCol));
                    break;
                case '.':
                    if (this.cur() === '.' && this.peek(1) === '.') {
                        this.advance();
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.VARARG, '...', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.DOT, '.', startLine, startCol));
                    }
                    break;
                case '=':
                    if (this.cur() === '=') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.EQ, '==', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.ASSIGN, '=', startLine, startCol));
                    }
                    break;
                case '!':
                    if (this.cur() === '=') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.NEQ, '!=', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.NOT, '!', startLine, startCol));
                    }
                    break;
                case '<':
                    if (this.cur() === '=') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.LTE, '<=', startLine, startCol));
                    }
                    else if (this.cur() === '<') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.LSHIFT, '<<', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.LT, '<', startLine, startCol));
                    }
                    break;
                case '>':
                    if (this.cur() === '=') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.GTE, '>=', startLine, startCol));
                    }
                    else if (this.cur() === '>') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.RSHIFT, '>>', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.GT, '>', startLine, startCol));
                    }
                    break;
                case '&':
                    if (this.cur() === '&') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.AND, '&&', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.BIT_AND, '&', startLine, startCol));
                    }
                    break;
                case '|':
                    if (this.cur() === '|') {
                        this.advance();
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.OR, '||', startLine, startCol));
                    }
                    else {
                        this.tokens.push(new ast_1.Token(ast_1.TokenKind.BIT_OR, '|', startLine, startCol));
                    }
                    break;
                case '^':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.BIT_XOR, '^', startLine, startCol));
                    break;
                case '~':
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.BIT_NOT, '~', startLine, startCol));
                    break;
                default:
                    this.tokens.push(new ast_1.Token(ast_1.TokenKind.ERROR, c, startLine, startCol));
                    break;
            }
        }
    }
    peekToken() {
        if (this.tokenPos < this.tokens.length) {
            return this.tokens[this.tokenPos];
        }
        return this.tokens[this.tokens.length - 1];
    }
    nextToken() {
        if (this.tokenPos < this.tokens.length) {
            return this.tokens[this.tokenPos++];
        }
        return this.tokens[this.tokens.length - 1];
    }
    getAllTokens() {
        return this.tokens;
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map