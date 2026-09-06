"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
const ast_1 = require("./ast");
const KEYWORDS = {
    'import': ast_1.TokenKind.IMPORT, 'extern': ast_1.TokenKind.EXTERN,
    'var': ast_1.TokenKind.VAR, 'const': ast_1.TokenKind.CONST,
    'if': ast_1.TokenKind.IF, 'else': ast_1.TokenKind.ELSE,
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
    'this': ast_1.TokenKind.THIS,
    'template': ast_1.TokenKind.TEMPLATE, 'typename': ast_1.TokenKind.TYPENAME,
    'sizeof': ast_1.TokenKind.SIZEOF,
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
    'macro': ast_1.TokenKind.AT_MACRO,
};
class Lexer {
    constructor(source) {
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.bol = 0;
        this.tokens = [];
        this.tokenPos = 0;
        this.macros = new Map();
        this.condStack = [];
        this.skippedRanges = [];
        this.errors = [];
        this.source = source;
        this.collectMacros();
        this.tokenize();
    }
    collectMacros() {
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
                    while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') {
                        this.advance();
                    }
                    if (this.cur() !== '\0' && this.cur() !== '\n' && this.isAlpha(this.cur())) {
                        let name = '';
                        while (this.isAlnum(this.cur())) {
                            name += this.advance();
                        }
                        while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') {
                            this.advance();
                        }
                        let value = '1';
                        if (this.cur() !== '\0' && this.cur() !== '\n') {
                            const vstart = this.pos;
                            if (this.isAlpha(this.cur())) {
                                while (this.isAlnum(this.cur())) {
                                    this.advance();
                                }
                            }
                            else if (this.isDigit(this.cur())) {
                                while (this.isDigit(this.cur()) || this.cur() === '.') {
                                    this.advance();
                                }
                            }
                            else if (this.cur() === '"') {
                                this.advance();
                                while (this.cur() !== '"' && this.cur() !== '\0' && this.cur() !== '\n') {
                                    this.advance();
                                }
                                if (this.cur() === '"') {
                                    this.advance();
                                }
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
                while (this.cur() !== '\n' && this.cur() !== '\0') {
                    this.advance();
                }
            }
            if (this.cur() === '\n') {
                this.advance();
            }
        }
        this.pos = savedPos;
        this.line = savedLine;
        this.col = savedCol;
    }
    get peekToken() {
        if (this.tokenPos < this.tokens.length) {
            return this.tokens[this.tokenPos];
        }
        return this.tokens[this.tokens.length - 1];
    }
    getAllTokens() {
        return this.tokens;
    }
    nextToken() {
        if (this.tokenPos < this.tokens.length) {
            return this.tokens[this.tokenPos++];
        }
        return this.tokens[this.tokens.length - 1];
    }
    isTemplateInstantiation() {
        const savedPos = this.tokenPos;
        if (this.tokenPos >= this.tokens.length) {
            return false;
        }
        const t1 = this.tokens[this.tokenPos];
        if (t1.kind !== ast_1.TokenKind.DOLLAR) {
            return false;
        }
        if (this.tokenPos + 1 >= this.tokens.length) {
            return false;
        }
        const t2 = this.tokens[this.tokenPos + 1];
        return t2.kind === ast_1.TokenKind.LPAREN;
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
            this.bol = this.pos;
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
                case '/':
                    return;
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
    isMacroDefined(name) {
        return this.macros.has(name);
    }
    addMacro(name, value) {
        if (this.macros.has(name)) {
            this.errors.push(`macro '${name}' is already defined`);
            return;
        }
        this.macros.set(name, value);
    }
    readIdent() {
        const startLine = this.line;
        const startCol = this.col;
        let text = '';
        while (this.isAlnum(this.cur())) {
            text += this.advance();
        }
        if (text === 'macro') {
            return new ast_1.Token(ast_1.TokenKind.ERROR, "'macro' is only allowed in conditional compilation context", startLine, startCol);
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
        this.advance();
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
        this.advance();
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
        this.advance();
        let text = '';
        while (this.isAlnum(this.cur())) {
            text += this.advance();
        }
        const kind = AT_DIRECTIVES[text];
        if (kind !== undefined) {
            return new ast_1.Token(kind, '@' + text, startLine, startCol);
        }
        return new ast_1.Token(ast_1.TokenKind.ERROR, "unknown directive '@" + text + "'", startLine, startCol);
    }
    preprocessToken() {
        while (true) {
            const t = this.rawToken();
            switch (t.kind) {
                case ast_1.TokenKind.AT_IF: {
                    let negate = false;
                    let next = this.rawToken();
                    if (next.kind === ast_1.TokenKind.NOT) {
                        negate = true;
                        next = this.rawToken();
                    }
                    let defined = false;
                    if (next.kind === ast_1.TokenKind.IDENT) {
                        defined = this.isMacroDefined(next.lexeme);
                    }
                    const result = negate ? !defined : defined;
                    if (result) {
                        this.condStack.push({ in_true_branch: true, skipping: false, has_else: false, skipStartLine: 0, skipStartCol: 0 });
                    }
                    else {
                        this.condStack.push({ in_true_branch: false, skipping: true, has_else: false, skipStartLine: 0, skipStartCol: 0 });
                    }
                    continue;
                }
                case ast_1.TokenKind.AT_ELIF: {
                    if (this.condStack.length === 0) {
                        this.errors.push(`Line ${t.line}:${t.col}: stray '@elif' outside of conditional compilation block`);
                        const next = this.rawToken();
                        if (next.kind === ast_1.TokenKind.NOT) { /* consume */ }
                        else { /* already consumed */ }
                        continue;
                    }
                    const state = this.condStack[this.condStack.length - 1];
                    if (state.has_else) {
                        this.errors.push(`Line ${t.line}:${t.col}: '@elif' after '@else'`);
                        const next = this.rawToken();
                        if (next.kind === ast_1.TokenKind.NOT) { /* consume */ }
                        continue;
                    }
                    if (state.in_true_branch) {
                        state.skipping = true;
                        state.skipStartLine = 0;
                        state.skipStartCol = 0;
                    }
                    else {
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
                        if (next.kind === ast_1.TokenKind.NOT) {
                            negate = true;
                            next = this.rawToken();
                        }
                        let defined = false;
                        if (next.kind === ast_1.TokenKind.IDENT) {
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
                case ast_1.TokenKind.AT_ELSE: {
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
                    }
                    else {
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
                case ast_1.TokenKind.AT_END: {
                    if (this.condStack.length === 0) {
                        this.errors.push(`Line ${t.line}:${t.col}: stray '@end' outside of conditional compilation block`);
                        continue;
                    }
                    const state = this.condStack.pop();
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
                case ast_1.TokenKind.AT_MACRO: {
                    const atLine = t.line;
                    const atCol = t.col;
                    while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') {
                        this.advance();
                    }
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
                    while (this.cur() === ' ' || this.cur() === '\t' || this.cur() === '\r') {
                        this.advance();
                    }
                    let value = '1';
                    if (this.cur() !== '\0' && this.cur() !== '\n') {
                        const valStart = this.pos;
                        if (this.isAlpha(this.cur())) {
                            while (this.isAlnum(this.cur())) {
                                this.advance();
                            }
                        }
                        else if (this.isDigit(this.cur())) {
                            while (this.isDigit(this.cur()) || this.cur() === '.') {
                                this.advance();
                            }
                        }
                        else if (this.cur() === '"') {
                            this.advance();
                            while (this.cur() !== '"' && this.cur() !== '\0' && this.cur() !== '\n') {
                                this.advance();
                            }
                            if (this.cur() === '"') {
                                this.advance();
                            }
                        }
                        const valLen = this.pos - valStart;
                        if (valLen > 0) {
                            value = this.source.substring(valStart, valStart + valLen);
                        }
                    }
                    this.addMacro(name, value);
                    continue;
                }
                case ast_1.TokenKind.EOF: {
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
    rawToken() {
        this.skipWhitespace();
        if (this.cur() === '\0') {
            return new ast_1.Token(ast_1.TokenKind.EOF, '', this.line, this.col);
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
            case '"':
                this.pos--;
                this.col--;
                return this.readString();
            case '\'':
                this.pos--;
                this.col--;
                return this.readChar();
            case '@':
                this.pos--;
                this.col--;
                return this.readAtDirective();
            case '+':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.PLUS_ASSIGN, '+=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.PLUS, '+', startLine, startCol);
            case '-':
                if (this.cur() === '>') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.ARROW, '->', startLine, startCol);
                }
                else if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.MINUS_ASSIGN, '-=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.MINUS, '-', startLine, startCol);
            case '*':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.STAR_ASSIGN, '*=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.STAR, '*', startLine, startCol);
            case '/':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.SLASH_ASSIGN, '/=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.SLASH, '/', startLine, startCol);
            case '%':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.PERCENT_ASSIGN, '%=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.PERCENT, '%', startLine, startCol);
            case '(': return new ast_1.Token(ast_1.TokenKind.LPAREN, '(', startLine, startCol);
            case ')': return new ast_1.Token(ast_1.TokenKind.RPAREN, ')', startLine, startCol);
            case '{': return new ast_1.Token(ast_1.TokenKind.LBRACE, '{', startLine, startCol);
            case '}': return new ast_1.Token(ast_1.TokenKind.RBRACE, '}', startLine, startCol);
            case '[': return new ast_1.Token(ast_1.TokenKind.LBRACKET, '[', startLine, startCol);
            case ']': return new ast_1.Token(ast_1.TokenKind.RBRACKET, ']', startLine, startCol);
            case ';': return new ast_1.Token(ast_1.TokenKind.SEMICOLON, ';', startLine, startCol);
            case ':':
                if (this.cur() === ':') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.DOUBLE_COLON, '::', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.COLON, ':', startLine, startCol);
            case ',': return new ast_1.Token(ast_1.TokenKind.COMMA, ',', startLine, startCol);
            case '.':
                if (this.cur() === '.' && this.peek(1) === '.') {
                    this.advance();
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.VARARG, '...', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.DOT, '.', startLine, startCol);
            case '=':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.EQ, '==', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.ASSIGN, '=', startLine, startCol);
            case '!':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.NEQ, '!=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.NOT, '!', startLine, startCol);
            case '<':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.LTE, '<=', startLine, startCol);
                }
                else if (this.cur() === '<') {
                    this.advance();
                    if (this.cur() === '=') {
                        this.advance();
                        return new ast_1.Token(ast_1.TokenKind.LSHIFT_ASSIGN, '<<=', startLine, startCol);
                    }
                    return new ast_1.Token(ast_1.TokenKind.LSHIFT, '<<', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.LT, '<', startLine, startCol);
            case '>':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.GTE, '>=', startLine, startCol);
                }
                else if (this.cur() === '>') {
                    this.advance();
                    if (this.cur() === '=') {
                        this.advance();
                        return new ast_1.Token(ast_1.TokenKind.RSHIFT_ASSIGN, '>>=', startLine, startCol);
                    }
                    return new ast_1.Token(ast_1.TokenKind.RSHIFT, '>>', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.GT, '>', startLine, startCol);
            case '&':
                if (this.cur() === '&') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.AND, '&&', startLine, startCol);
                }
                else if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.AND_ASSIGN, '&=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.BIT_AND, '&', startLine, startCol);
            case '|':
                if (this.cur() === '|') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.OR, '||', startLine, startCol);
                }
                else if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.OR_ASSIGN, '|=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.BIT_OR, '|', startLine, startCol);
            case '^':
                if (this.cur() === '=') {
                    this.advance();
                    return new ast_1.Token(ast_1.TokenKind.XOR_ASSIGN, '^=', startLine, startCol);
                }
                return new ast_1.Token(ast_1.TokenKind.BIT_XOR, '^', startLine, startCol);
            case '~': return new ast_1.Token(ast_1.TokenKind.BIT_NOT, '~', startLine, startCol);
            case '$': return new ast_1.Token(ast_1.TokenKind.DOLLAR, '$', startLine, startCol);
            default:
                return new ast_1.Token(ast_1.TokenKind.ERROR, "unexpected character '" + c + "'", startLine, startCol);
        }
    }
    tokenize() {
        while (true) {
            const t = this.preprocessToken();
            this.tokens.push(t);
            if (t.kind === ast_1.TokenKind.EOF) {
                break;
            }
        }
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map