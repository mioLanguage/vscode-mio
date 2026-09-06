"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const ast_1 = require("./ast");
const lexer_1 = require("./lexer");
class Parser {
    constructor(source) {
        this.errors = [];
        this.classNames = new Set();
        this.classBaseMap = new Map();
        this.classVirtualMethods = new Map();
        this.classMethodNames = new Map();
        this.lexer = new lexer_1.Lexer(source);
        this.cur = this.lexer.nextToken();
    }
    getErrors() {
        return [...this.lexer.errors, ...this.errors];
    }
    getSkippedRanges() {
        return this.lexer.skippedRanges;
    }
    error(msg) {
        this.errors.push(`Line ${this.cur.line}:${this.cur.col}: ${msg}`);
    }
    errorExpected(expected) {
        if (this.cur.kind === ast_1.TokenKind.ERROR) {
            this.error(this.cur.lexeme);
        }
        else {
            this.error(`expected '${expected}', got '${(0, ast_1.tokenName)(this.cur.kind)}'`);
        }
    }
    advance() {
        this.cur = this.lexer.nextToken();
    }
    check(kind) {
        return this.cur.kind === kind;
    }
    match(kind) {
        if (this.check(kind)) {
            this.advance();
            return true;
        }
        return false;
    }
    expect(kind) {
        if (this.match(kind)) {
            return true;
        }
        this.errorExpected((0, ast_1.tokenName)(kind));
        return false;
    }
    isKeywordToken(kind) {
        switch (kind) {
            case ast_1.TokenKind.IMPORT:
            case ast_1.TokenKind.EXTERN:
            case ast_1.TokenKind.VAR:
            case ast_1.TokenKind.CONST:
            case ast_1.TokenKind.IF:
            case ast_1.TokenKind.ELSE:
            case ast_1.TokenKind.WHILE:
            case ast_1.TokenKind.FOR:
            case ast_1.TokenKind.BREAK:
            case ast_1.TokenKind.CONTINUE:
            case ast_1.TokenKind.GOTO:
            case ast_1.TokenKind.RETURN:
            case ast_1.TokenKind.ENUM:
            case ast_1.TokenKind.UNION:
            case ast_1.TokenKind.CLASS:
            case ast_1.TokenKind.NAMESPACE:
            case ast_1.TokenKind.PUBLIC:
            case ast_1.TokenKind.PRIVATE:
            case ast_1.TokenKind.PROTECTED:
            case ast_1.TokenKind.VIRTUAL:
            case ast_1.TokenKind.OVERRIDE:
            case ast_1.TokenKind.STATIC:
            case ast_1.TokenKind.OPERATOR:
            case ast_1.TokenKind.TRUE:
            case ast_1.TokenKind.FALSE:
            case ast_1.TokenKind.THIS:
            case ast_1.TokenKind.I8:
            case ast_1.TokenKind.I16:
            case ast_1.TokenKind.I32:
            case ast_1.TokenKind.I64:
            case ast_1.TokenKind.I128:
            case ast_1.TokenKind.U8:
            case ast_1.TokenKind.U16:
            case ast_1.TokenKind.U32:
            case ast_1.TokenKind.U64:
            case ast_1.TokenKind.U128:
            case ast_1.TokenKind.USIZE:
            case ast_1.TokenKind.ISIZE:
            case ast_1.TokenKind.F32:
            case ast_1.TokenKind.F64:
            case ast_1.TokenKind.BOOL:
            case ast_1.TokenKind.CHAR:
            case ast_1.TokenKind.VOID:
            case ast_1.TokenKind.TEMPLATE:
            case ast_1.TokenKind.TYPENAME:
            case ast_1.TokenKind.SIZEOF:
                return true;
            default: return false;
        }
    }
    isTypeToken(kind) {
        switch (kind) {
            case ast_1.TokenKind.I8:
            case ast_1.TokenKind.I16:
            case ast_1.TokenKind.I32:
            case ast_1.TokenKind.I64:
            case ast_1.TokenKind.I128:
            case ast_1.TokenKind.U8:
            case ast_1.TokenKind.U16:
            case ast_1.TokenKind.U32:
            case ast_1.TokenKind.U64:
            case ast_1.TokenKind.U128:
            case ast_1.TokenKind.USIZE:
            case ast_1.TokenKind.ISIZE:
            case ast_1.TokenKind.F32:
            case ast_1.TokenKind.F64:
            case ast_1.TokenKind.BOOL:
            case ast_1.TokenKind.CHAR:
            case ast_1.TokenKind.VOID:
            case ast_1.TokenKind.IDENT:
            case ast_1.TokenKind.STAR:
            case ast_1.TokenKind.BIT_AND:
                return true;
            default: return false;
        }
    }
    expectIdent() {
        if (this.cur.kind === ast_1.TokenKind.IDENT) {
            this.advance();
            return true;
        }
        if (this.isKeywordToken(this.cur.kind)) {
            this.error(`keyword '${(0, ast_1.tokenName)(this.cur.kind)}' cannot be used as an identifier`);
        }
        else {
            this.errorExpected('identifier');
        }
        return false;
    }
    parse() {
        const program = new ast_1.AstNode(ast_1.AstNodeKind.PROGRAM, 0, 0);
        while (!this.check(ast_1.TokenKind.EOF)) {
            const decl = this.parseDecl();
            if (decl) {
                program.decls.push(decl);
            }
        }
        return program;
    }
    parseDecl() {
        while (this.match(ast_1.TokenKind.SEMICOLON)) { }
        switch (this.cur.kind) {
            case ast_1.TokenKind.IMPORT: {
                this.advance();
                const line = this.cur.line;
                const col = this.cur.col;
                const first = this.parseSingleImport(line, col);
                if (!this.match(ast_1.TokenKind.COMMA)) {
                    this.expect(ast_1.TokenKind.SEMICOLON);
                    return first;
                }
                const block = new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, line, col);
                block.isScope = false;
                if (first) {
                    block.stmts.push(first);
                }
                do {
                    const imp = this.parseSingleImport(line, col);
                    if (imp) {
                        block.stmts.push(imp);
                    }
                } while (this.match(ast_1.TokenKind.COMMA));
                this.expect(ast_1.TokenKind.SEMICOLON);
                return block.stmts.length > 0 ? block : null;
            }
            case ast_1.TokenKind.EXTERN: {
                this.advance();
                if (this.match(ast_1.TokenKind.VAR)) {
                    return this.parseVarDecl(false, false, true, true);
                }
                if (this.match(ast_1.TokenKind.CONST)) {
                    return this.parseVarDecl(true, false, true, true);
                }
                return this.parseFuncDef(false, true);
            }
            case ast_1.TokenKind.VAR:
                return this.parseVarDecl(false, false);
            case ast_1.TokenKind.CONST:
                return this.parseVarDecl(true, false);
            case ast_1.TokenKind.STATIC: {
                this.advance();
                if (this.match(ast_1.TokenKind.VAR)) {
                    return this.parseVarDecl(false, true);
                }
                if (this.match(ast_1.TokenKind.CONST)) {
                    return this.parseVarDecl(true, true);
                }
                return this.parseFuncDef(true);
            }
            case ast_1.TokenKind.ENUM:
                return this.parseEnumDef();
            case ast_1.TokenKind.UNION:
                return this.parseUnionDef();
            case ast_1.TokenKind.CLASS:
                return this.parseClassDef();
            case ast_1.TokenKind.NAMESPACE:
                return this.parseNamespaceDef();
            case ast_1.TokenKind.TEMPLATE:
                return this.parseTemplateDef();
            case ast_1.TokenKind.EOF:
                return null;
            default: {
                let mv = this.match(ast_1.TokenKind.VIRTUAL);
                if (!mv) {
                    mv = this.match(ast_1.TokenKind.OVERRIDE);
                }
                if (mv || this.isTypeToken(this.cur.kind)) {
                    return this.parseFuncDef(false);
                }
                this.error('expected declaration');
                while (!this.check(ast_1.TokenKind.EOF) && !this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.RBRACE)) {
                    this.advance();
                }
                this.advance();
                return null;
            }
        }
    }
    parseSingleImport(line, col) {
        if (this.check(ast_1.TokenKind.STRING_LIT)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.IMPORT, line, col);
            node.importPath = this.cur.lexeme;
            this.advance();
            return node;
        }
        else if (this.check(ast_1.TokenKind.IDENT)) {
            const path = this.parseImportPath();
            if (path) {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.NAMESPACE_IMPORT, line, col);
                node.namespaceImportName = path;
                return node;
            }
            return null;
        }
        else {
            this.errorExpected('import path');
            return null;
        }
    }
    parseImportPath() {
        let buf = '';
        while (this.check(ast_1.TokenKind.IDENT)) {
            buf += this.cur.lexeme;
            this.advance();
            if (this.match(ast_1.TokenKind.DOUBLE_COLON)) {
                buf += '::';
            }
            else {
                break;
            }
        }
        if (buf === '') {
            this.errorExpected('import path');
            return '';
        }
        return buf;
    }
    parseBaseType() {
        switch (this.cur.kind) {
            case ast_1.TokenKind.I8:
                this.advance();
                return 'i8';
            case ast_1.TokenKind.I16:
                this.advance();
                return 'i16';
            case ast_1.TokenKind.I32:
                this.advance();
                return 'i32';
            case ast_1.TokenKind.I64:
                this.advance();
                return 'i64';
            case ast_1.TokenKind.I128:
                this.advance();
                return 'i128';
            case ast_1.TokenKind.U8:
                this.advance();
                return 'u8';
            case ast_1.TokenKind.U16:
                this.advance();
                return 'u16';
            case ast_1.TokenKind.U32:
                this.advance();
                return 'u32';
            case ast_1.TokenKind.U64:
                this.advance();
                return 'u64';
            case ast_1.TokenKind.U128:
                this.advance();
                return 'u128';
            case ast_1.TokenKind.USIZE:
                this.advance();
                return 'usize';
            case ast_1.TokenKind.ISIZE:
                this.advance();
                return 'isize';
            case ast_1.TokenKind.F32:
                this.advance();
                return 'f32';
            case ast_1.TokenKind.F64:
                this.advance();
                return 'f64';
            case ast_1.TokenKind.BOOL:
                this.advance();
                return 'bool';
            case ast_1.TokenKind.CHAR:
                this.advance();
                return 'char';
            case ast_1.TokenKind.VOID:
                this.advance();
                return 'void';
            case ast_1.TokenKind.IDENT: {
                const name = this.cur.lexeme;
                this.advance();
                if (this.match(ast_1.TokenKind.DOUBLE_COLON)) {
                    if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                        this.errorExpected("type name after '::'");
                        return '';
                    }
                    const fullName = name + '::' + this.cur.lexeme;
                    this.advance();
                    let result = fullName;
                    if (this.match(ast_1.TokenKind.DOLLAR)) {
                        result += '$';
                        do {
                            result += this.parseType();
                        } while (this.match(ast_1.TokenKind.COMMA));
                        if (!this.match(ast_1.TokenKind.DOLLAR)) {
                            this.errorExpected("'$'");
                        }
                        result += '$';
                    }
                    return result;
                }
                let result = name;
                if (this.match(ast_1.TokenKind.DOLLAR)) {
                    result += '$';
                    do {
                        result += this.parseType();
                    } while (this.match(ast_1.TokenKind.COMMA));
                    if (!this.match(ast_1.TokenKind.DOLLAR)) {
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
    parseType() {
        return this.parseTypePrefix();
    }
    parseTypePrefix() {
        if (this.match(ast_1.TokenKind.STAR)) {
            const base = this.parseTypePrefix();
            return '*' + base;
        }
        if (this.match(ast_1.TokenKind.BIT_AND)) {
            if (this.match(ast_1.TokenKind.BIT_AND)) {
                this.error("too many '&' in reference type");
                return '&&' + this.parseTypePrefix();
            }
            const base = this.parseTypePrefix();
            return '&' + base;
        }
        if (this.match(ast_1.TokenKind.AND)) {
            const base = this.parseTypePrefix();
            return '&&' + base;
        }
        return this.parseBaseTypeWithSuffix();
    }
    parseBaseTypeWithSuffix() {
        const base = this.parseBaseType();
        return this.parseTypeSuffix(base);
    }
    parseTypeSuffix(base) {
        let result = base;
        while (this.match(ast_1.TokenKind.LBRACKET)) {
            if (this.cur.kind === ast_1.TokenKind.INT_LIT) {
                const size = this.cur.lexeme;
                this.advance();
                this.expect(ast_1.TokenKind.RBRACKET);
                result += '[' + size + ']';
            }
            else {
                this.expect(ast_1.TokenKind.RBRACKET);
                result += '[]';
            }
        }
        return result;
    }
    parsePrimary() {
        const t = this.cur;
        switch (t.kind) {
            case ast_1.TokenKind.INT_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, t.line, t.col);
                node.intVal = t.intVal;
                return node;
            }
            case ast_1.TokenKind.FLOAT_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.FLOAT_LIT, t.line, t.col);
                node.floatVal = t.floatVal;
                return node;
            }
            case ast_1.TokenKind.STRING_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.STRING_LIT, t.line, t.col);
                node.stringVal = t.lexeme;
                return node;
            }
            case ast_1.TokenKind.CHAR_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.CHAR_LIT, t.line, t.col);
                node.charVal = t.lexeme;
                return node;
            }
            case ast_1.TokenKind.SIZEOF: {
                this.advance();
                this.expect(ast_1.TokenKind.LPAREN);
                const targetType = this.parseType();
                this.expect(ast_1.TokenKind.RPAREN);
                const node = new ast_1.AstNode(ast_1.AstNodeKind.SIZEOF_EXPR, t.line, t.col);
                node.sizeofTargetType = targetType;
                return node;
            }
            case ast_1.TokenKind.TRUE: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BOOL_LIT, t.line, t.col);
                node.boolVal = true;
                return node;
            }
            case ast_1.TokenKind.FALSE: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BOOL_LIT, t.line, t.col);
                node.boolVal = false;
                return node;
            }
            case ast_1.TokenKind.THIS: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, t.line, t.col);
                node.identName = 'this';
                return node;
            }
            case ast_1.TokenKind.IDENT: {
                const name = t.lexeme;
                const line = t.line;
                const col = t.col;
                this.advance();
                if (this.cur.kind === ast_1.TokenKind.STAR && this.lexer.peekToken?.kind === ast_1.TokenKind.LPAREN) {
                    this.advance();
                    this.advance();
                    const expr = this.parseExpr();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, line, col);
                    node.castType = '*' + name;
                    node.left = expr;
                    return node;
                }
                if (this.match(ast_1.TokenKind.DOUBLE_COLON)) {
                    if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                        this.errorExpected("identifier after '::'");
                        const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                        node.identName = name;
                        return node;
                    }
                    const n = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, this.cur.line, this.cur.col);
                    n.identName = this.cur.lexeme;
                    n.namespaceName = name;
                    this.advance();
                    return n;
                }
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                node.identName = name;
                return node;
            }
            case ast_1.TokenKind.DOUBLE_COLON: {
                this.advance();
                if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                    this.errorExpected("identifier after '::'");
                    return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, t.line, t.col);
                }
                const n = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, this.cur.line, this.cur.col);
                n.identName = this.cur.lexeme;
                n.namespaceName = '::';
                this.advance();
                return n;
            }
            case ast_1.TokenKind.LPAREN: {
                this.advance();
                const expr = this.parseExpr();
                this.expect(ast_1.TokenKind.RPAREN);
                return expr;
            }
            case ast_1.TokenKind.LBRACE: {
                this.advance();
                const arr = new ast_1.AstNode(ast_1.AstNodeKind.ARRAY_LIT, t.line, t.col);
                if (!this.check(ast_1.TokenKind.RBRACE)) {
                    arr.arrayElements.push(this.parseExpr());
                    while (this.match(ast_1.TokenKind.COMMA)) {
                        if (this.check(ast_1.TokenKind.RBRACE)) {
                            break;
                        }
                        arr.arrayElements.push(this.parseExpr());
                    }
                }
                this.expect(ast_1.TokenKind.RBRACE);
                return arr;
            }
            case ast_1.TokenKind.I32:
            case ast_1.TokenKind.I64:
            case ast_1.TokenKind.I128:
            case ast_1.TokenKind.U32:
            case ast_1.TokenKind.U64:
            case ast_1.TokenKind.U128:
            case ast_1.TokenKind.F32:
            case ast_1.TokenKind.F64:
            case ast_1.TokenKind.BOOL:
            case ast_1.TokenKind.CHAR: {
                let typeName = '';
                switch (t.kind) {
                    case ast_1.TokenKind.I32:
                        typeName = 'i32';
                        break;
                    case ast_1.TokenKind.I64:
                        typeName = 'i64';
                        break;
                    case ast_1.TokenKind.I128:
                        typeName = 'i128';
                        break;
                    case ast_1.TokenKind.U32:
                        typeName = 'u32';
                        break;
                    case ast_1.TokenKind.U64:
                        typeName = 'u64';
                        break;
                    case ast_1.TokenKind.U128:
                        typeName = 'u128';
                        break;
                    case ast_1.TokenKind.F32:
                        typeName = 'f32';
                        break;
                    case ast_1.TokenKind.F64:
                        typeName = 'f64';
                        break;
                    case ast_1.TokenKind.BOOL:
                        typeName = 'bool';
                        break;
                    case ast_1.TokenKind.CHAR:
                        typeName = 'char';
                        break;
                }
                this.advance();
                if (this.check(ast_1.TokenKind.STAR) && this.lexer.peekToken?.kind === ast_1.TokenKind.LPAREN) {
                    this.advance();
                    this.advance();
                    const expr = this.parseExpr();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, t.line, t.col);
                    node.castType = '*' + typeName;
                    node.left = expr;
                    return node;
                }
                if (this.check(ast_1.TokenKind.LPAREN)) {
                    this.advance();
                    const expr = this.parseExpr();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, t.line, t.col);
                    node.castType = typeName;
                    node.left = expr;
                    return node;
                }
                this.errorExpected('expression');
                return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, t.line, t.col);
            }
            default:
                this.errorExpected('expression');
                this.advance();
                return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, t.line, t.col);
        }
    }
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (expr.kind === ast_1.AstNodeKind.IDENT_EXPR && this.check(ast_1.TokenKind.DOLLAR)) {
                if (this.lexer.isTemplateInstantiation()) {
                    this.advance();
                    const call = new ast_1.AstNode(ast_1.AstNodeKind.CALL_EXPR, expr.line, expr.col);
                    call.callee = expr;
                    call.templateArgs = [];
                    do {
                        if (this.isTypeToken(this.cur.kind)) {
                            call.templateArgs.push({ isType: true, typeName: this.parseType() });
                        }
                        else {
                            call.templateArgs.push({ isType: false, expr: this.parseExpr() });
                        }
                    } while (this.match(ast_1.TokenKind.COMMA));
                    if (!this.match(ast_1.TokenKind.DOLLAR)) {
                        this.errorExpected("'$'");
                    }
                    if (this.match(ast_1.TokenKind.LPAREN)) {
                        if (!this.check(ast_1.TokenKind.RPAREN)) {
                            call.args.push(this.parseExpr());
                            while (this.match(ast_1.TokenKind.COMMA)) {
                                call.args.push(this.parseExpr());
                            }
                        }
                        this.expect(ast_1.TokenKind.RPAREN);
                    }
                    expr = call;
                    continue;
                }
                else {
                    this.error("unexpected '$' after identifier");
                    this.advance();
                }
            }
            if (this.match(ast_1.TokenKind.LPAREN)) {
                const call = new ast_1.AstNode(ast_1.AstNodeKind.CALL_EXPR, expr.line, expr.col);
                call.callee = expr;
                if (!this.check(ast_1.TokenKind.RPAREN)) {
                    call.args.push(this.parseExpr());
                    while (this.match(ast_1.TokenKind.COMMA)) {
                        call.args.push(this.parseExpr());
                    }
                }
                this.expect(ast_1.TokenKind.RPAREN);
                expr = call;
            }
            else if (this.match(ast_1.TokenKind.LBRACKET)) {
                const index = this.parseExpr();
                this.expect(ast_1.TokenKind.RBRACKET);
                const idxNode = new ast_1.AstNode(ast_1.AstNodeKind.INDEX_EXPR, expr.line, expr.col);
                idxNode.left = expr;
                idxNode.indexExpr = index;
                expr = idxNode;
            }
            else if (this.match(ast_1.TokenKind.DOT)) {
                if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                    if (this.isKeywordToken(this.cur.kind)) {
                        this.error(`keyword '${(0, ast_1.tokenName)(this.cur.kind)}' cannot be used as a member name`);
                    }
                    else {
                        this.errorExpected("identifier after '.'");
                    }
                    break;
                }
                const memNode = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
                memNode.left = expr;
                memNode.memberName = this.cur.lexeme;
                memNode.arrow = false;
                this.advance();
                expr = memNode;
            }
            else if (this.match(ast_1.TokenKind.ARROW)) {
                if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                    if (this.isKeywordToken(this.cur.kind)) {
                        this.error(`keyword '${(0, ast_1.tokenName)(this.cur.kind)}' cannot be used as a member name`);
                    }
                    else {
                        this.errorExpected("identifier after '->'");
                    }
                    break;
                }
                const memNode = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
                memNode.left = expr;
                memNode.memberName = this.cur.lexeme;
                memNode.arrow = true;
                this.advance();
                expr = memNode;
            }
            else {
                break;
            }
        }
        return expr;
    }
    parseUnary() {
        const op = this.cur.kind;
        switch (op) {
            case ast_1.TokenKind.MINUS:
            case ast_1.TokenKind.NOT:
            case ast_1.TokenKind.BIT_NOT:
            case ast_1.TokenKind.STAR:
            case ast_1.TokenKind.BIT_AND:
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.UNARY_EXPR, this.cur.line, this.cur.col);
                node.op = ast_1.TokenKind[op];
                node.operand = this.parseUnary();
                return node;
            default:
                return this.parsePostfix();
        }
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (true) {
            const op = this.cur.kind;
            if (op === ast_1.TokenKind.STAR || op === ast_1.TokenKind.SLASH || op === ast_1.TokenKind.PERCENT) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
                node.left = left;
                node.op = ast_1.TokenKind[op];
                node.right = this.parseUnary();
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (true) {
            const op = this.cur.kind;
            if (op === ast_1.TokenKind.PLUS || op === ast_1.TokenKind.MINUS) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
                node.left = left;
                node.op = ast_1.TokenKind[op];
                node.right = this.parseMultiplicative();
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parseShift() {
        let left = this.parseAdditive();
        while (true) {
            const op = this.cur.kind;
            if (op === ast_1.TokenKind.LSHIFT || op === ast_1.TokenKind.RSHIFT) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
                node.left = left;
                node.op = ast_1.TokenKind[op];
                node.right = this.parseAdditive();
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parseRelational() {
        let left = this.parseShift();
        while (true) {
            const op = this.cur.kind;
            if (op === ast_1.TokenKind.LT || op === ast_1.TokenKind.GT || op === ast_1.TokenKind.LTE || op === ast_1.TokenKind.GTE) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
                node.left = left;
                node.op = ast_1.TokenKind[op];
                node.right = this.parseShift();
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parseEquality() {
        let left = this.parseRelational();
        while (true) {
            const op = this.cur.kind;
            if (op === ast_1.TokenKind.EQ || op === ast_1.TokenKind.NEQ) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
                node.left = left;
                node.op = ast_1.TokenKind[op];
                node.right = this.parseRelational();
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parseBitAnd() {
        let left = this.parseEquality();
        while (this.match(ast_1.TokenKind.BIT_AND)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = 'BIT_AND';
            node.right = this.parseEquality();
            left = node;
        }
        return left;
    }
    parseBitXor() {
        let left = this.parseBitAnd();
        while (this.match(ast_1.TokenKind.BIT_XOR)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = 'BIT_XOR';
            node.right = this.parseBitAnd();
            left = node;
        }
        return left;
    }
    parseBitOr() {
        let left = this.parseBitXor();
        while (this.match(ast_1.TokenKind.BIT_OR)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = 'BIT_OR';
            node.right = this.parseBitXor();
            left = node;
        }
        return left;
    }
    parseLogicalAnd() {
        let left = this.parseBitOr();
        while (this.match(ast_1.TokenKind.AND)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = 'AND';
            node.right = this.parseBitOr();
            left = node;
        }
        return left;
    }
    parseLogicalOr() {
        let left = this.parseLogicalAnd();
        while (this.match(ast_1.TokenKind.OR)) {
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = 'OR';
            node.right = this.parseLogicalAnd();
            left = node;
        }
        return left;
    }
    parseAssignment() {
        const left = this.parseLogicalOr();
        const assignOps = [
            ast_1.TokenKind.ASSIGN, ast_1.TokenKind.PLUS_ASSIGN, ast_1.TokenKind.MINUS_ASSIGN,
            ast_1.TokenKind.STAR_ASSIGN, ast_1.TokenKind.SLASH_ASSIGN, ast_1.TokenKind.PERCENT_ASSIGN,
            ast_1.TokenKind.AND_ASSIGN, ast_1.TokenKind.OR_ASSIGN, ast_1.TokenKind.XOR_ASSIGN,
            ast_1.TokenKind.LSHIFT_ASSIGN, ast_1.TokenKind.RSHIFT_ASSIGN,
        ];
        if (assignOps.includes(this.cur.kind)) {
            const op = this.cur.kind;
            this.advance();
            const right = this.parseAssignment();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.ASSIGN_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = right;
            return node;
        }
        return left;
    }
    parseExpr() {
        return this.parseAssignment();
    }
    parseBlock() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.expect(ast_1.TokenKind.LBRACE);
        const block = new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, line, col);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const stmt = this.parseStmt();
            if (stmt) {
                block.stmts.push(stmt);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return block;
    }
    parseVarItems(isConst, isStatic, isExtern) {
        const line = this.cur.line;
        const col = this.cur.col;
        const name = this.cur.lexeme;
        if (!this.expectIdent()) {
            return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
        }
        let typeName = '';
        let initExpr;
        if (this.match(ast_1.TokenKind.COLON)) {
            typeName = this.parseType();
        }
        if (this.match(ast_1.TokenKind.ASSIGN)) {
            initExpr = this.parseExpr();
        }
        if (!typeName && !initExpr) {
            this.error(`variable '${name}' requires a type or an initializer`);
        }
        if (initExpr && initExpr.kind === ast_1.AstNodeKind.ARRAY_LIT) {
            if (typeName && typeName.endsWith('[]')) {
                typeName = typeName.replace('[]', '[' + initExpr.arrayElements.length + ']');
            }
            else if (!typeName) {
                let base = 'i32';
                if (initExpr.arrayElements.length > 0) {
                    const first = initExpr.arrayElements[0];
                    switch (first.kind) {
                        case ast_1.AstNodeKind.INT_LIT:
                            base = 'i32';
                            break;
                        case ast_1.AstNodeKind.FLOAT_LIT:
                            base = 'f64';
                            break;
                        case ast_1.AstNodeKind.BOOL_LIT:
                            base = 'bool';
                            break;
                        case ast_1.AstNodeKind.CHAR_LIT:
                            base = 'char';
                            break;
                        case ast_1.AstNodeKind.STRING_LIT:
                            base = 'char';
                            break;
                    }
                }
                typeName = base + '[' + initExpr.arrayElements.length + ']';
            }
        }
        const node = new ast_1.AstNode(isConst ? ast_1.AstNodeKind.CONST_DECL : ast_1.AstNodeKind.VAR_DECL, line, col);
        node.varName = name;
        node.varType = typeName || undefined;
        node.initExpr = initExpr;
        node.isStatic = isStatic;
        node.isExtern = isExtern;
        return node;
    }
    parseVarDecl(isConst, isStatic, isExtern = false, skipAdvance = false) {
        if (!skipAdvance) {
            this.advance();
        }
        const block = new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, this.cur.line, this.cur.col);
        block.isScope = false;
        block.stmts.push(this.parseVarItems(isConst, isStatic, isExtern));
        while (this.match(ast_1.TokenKind.COMMA)) {
            block.stmts.push(this.parseVarItems(isConst, isStatic, isExtern));
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        return block;
    }
    parseIfStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.LPAREN);
        const cond = this.parseExpr();
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.RBRACE)) {
            this.error("expected statement after 'if'");
            const node = new ast_1.AstNode(ast_1.AstNodeKind.IF_STMT, line, col);
            node.condition = cond;
            return node;
        }
        const thenBody = this.parseStmt();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.IF_STMT, line, col);
        node.condition = cond;
        node.thenBlock = thenBody || undefined;
        if (this.match(ast_1.TokenKind.ELSE)) {
            if (this.check(ast_1.TokenKind.RBRACE)) {
                this.error("expected statement after 'else'");
                return node;
            }
            node.elseBlock = this.parseStmt() || undefined;
        }
        return node;
    }
    parseWhileStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.LPAREN);
        const cond = this.parseExpr();
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.RBRACE)) {
            this.error("expected statement after 'while'");
            const node = new ast_1.AstNode(ast_1.AstNodeKind.WHILE_STMT, line, col);
            node.condition = cond;
            return node;
        }
        const body = this.parseStmt();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.WHILE_STMT, line, col);
        node.condition = cond;
        node.thenBlock = body || undefined;
        return node;
    }
    parseForStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.LPAREN);
        let init;
        let cond;
        let update;
        if (this.match(ast_1.TokenKind.VAR)) {
            init = this.parseVarItems(false, false, false);
        }
        else if (this.match(ast_1.TokenKind.CONST)) {
            init = this.parseVarItems(true, false, false);
        }
        else if (!this.check(ast_1.TokenKind.SEMICOLON)) {
            init = this.parseExpr();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.SEMICOLON)) {
            cond = this.parseExpr();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            update = this.parseExpr();
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.RBRACE)) {
            this.error("expected statement after 'for'");
            const node = new ast_1.AstNode(ast_1.AstNodeKind.FOR_STMT, line, col);
            node.forInit = init;
            node.condition = cond;
            node.forUpdate = update;
            return node;
        }
        const body = this.parseStmt();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FOR_STMT, line, col);
        node.forInit = init;
        node.condition = cond;
        node.forUpdate = update;
        node.thenBlock = body || undefined;
        return node;
    }
    parseReturnStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        let value;
        if (!this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.RBRACE)) {
            value = this.parseExpr();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.RETURN_STMT, line, col);
        node.returnExpr = value;
        return node;
    }
    parseStmt() {
        switch (this.cur.kind) {
            case ast_1.TokenKind.VAR:
                return this.parseVarDecl(false, false);
            case ast_1.TokenKind.CONST:
                return this.parseVarDecl(true, false);
            case ast_1.TokenKind.IF:
                return this.parseIfStmt();
            case ast_1.TokenKind.WHILE:
                return this.parseWhileStmt();
            case ast_1.TokenKind.FOR:
                return this.parseForStmt();
            case ast_1.TokenKind.BREAK:
                this.advance();
                this.expect(ast_1.TokenKind.SEMICOLON);
                return new ast_1.AstNode(ast_1.AstNodeKind.BREAK_STMT, this.cur.line, this.cur.col);
            case ast_1.TokenKind.CONTINUE:
                this.advance();
                this.expect(ast_1.TokenKind.SEMICOLON);
                return new ast_1.AstNode(ast_1.AstNodeKind.CONTINUE_STMT, this.cur.line, this.cur.col);
            case ast_1.TokenKind.GOTO: {
                this.advance();
                const line = this.cur.line;
                const col = this.cur.col;
                const label = this.cur.lexeme;
                if (!this.expectIdent()) {
                    this.expect(ast_1.TokenKind.SEMICOLON);
                    return null;
                }
                this.expect(ast_1.TokenKind.SEMICOLON);
                const node = new ast_1.AstNode(ast_1.AstNodeKind.GOTO_STMT, line, col);
                node.labelName = label;
                return node;
            }
            case ast_1.TokenKind.COLON: {
                this.advance();
                const line = this.cur.line;
                const col = this.cur.col;
                const label = this.cur.lexeme;
                if (!this.expectIdent()) {
                    return null;
                }
                const node = new ast_1.AstNode(ast_1.AstNodeKind.LABEL_STMT, line, col);
                node.labelName = label;
                return node;
            }
            case ast_1.TokenKind.RETURN:
                return this.parseReturnStmt();
            case ast_1.TokenKind.LBRACE:
                return this.parseBlock();
            case ast_1.TokenKind.SEMICOLON:
                this.advance();
                return null;
            default: {
                const expr = this.parseExpr();
                if (!expr) {
                    this.error('failed to parse expression');
                    return null;
                }
                if (this.match(ast_1.TokenKind.SEMICOLON)) {
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.EXPR_STMT, expr.line, expr.col);
                    node.left = expr;
                    return node;
                }
                const node = new ast_1.AstNode(ast_1.AstNodeKind.RETURN_STMT, expr.line, expr.col);
                node.returnExpr = expr;
                return node;
            }
        }
    }
    parseFuncDef(isStatic, isExtern = false, preParsedReturnType) {
        const line = preParsedReturnType ? preParsedReturnType.line : this.cur.line;
        const col = preParsedReturnType ? preParsedReturnType.col : this.cur.col;
        let returnType = '';
        if (preParsedReturnType) {
            returnType = preParsedReturnType.returnType || '';
        }
        else {
            returnType = this.parseType();
        }
        let isOperator = false;
        let funcName = '';
        let opName = '';
        if (this.match(ast_1.TokenKind.OPERATOR)) {
            isOperator = true;
            funcName = 'operator' + ast_1.TokenKind[this.cur.kind];
            opName = ast_1.TokenKind[this.cur.kind];
            if (this.cur.kind === ast_1.TokenKind.LBRACKET) {
                this.advance();
                this.expect(ast_1.TokenKind.RBRACKET);
            }
            else {
                this.advance();
            }
        }
        else if (this.cur.kind === ast_1.TokenKind.IDENT) {
            funcName = this.cur.lexeme;
            this.advance();
        }
        else if (this.cur.kind === ast_1.TokenKind.LPAREN) {
            funcName = returnType || 'constructor';
        }
        else if (this.isKeywordToken(this.cur.kind)) {
            this.error(`keyword '${(0, ast_1.tokenName)(this.cur.kind)}' cannot be used as a function name`);
            return null;
        }
        else {
            this.errorExpected('function name');
            return null;
        }
        const func = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        func.funcName = funcName;
        func.returnType = returnType;
        func.isStatic = isStatic;
        func.isExtern = isExtern;
        func.isOperator = isOperator;
        if (isOperator) {
            func.opName = opName;
        }
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            do {
                if (this.match(ast_1.TokenKind.VARARG)) {
                    func.isVariadic = true;
                    break;
                }
                const pname = this.cur.lexeme;
                if (!this.expectIdent()) {
                    continue;
                }
                this.expect(ast_1.TokenKind.COLON);
                const ptype = this.parseType();
                if (!ptype) {
                    this.error(`expected type for parameter '${pname}'`);
                    continue;
                }
                let defaultVal;
                if (this.match(ast_1.TokenKind.ASSIGN)) {
                    defaultVal = this.parseExpr();
                    if (!defaultVal) {
                        this.error("expected default value after '='");
                    }
                }
                func.params.push({ name: pname, typeName: ptype, defaultVal });
            } while (this.match(ast_1.TokenKind.COMMA));
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.match(ast_1.TokenKind.ASSIGN)) {
            if (this.cur.kind === ast_1.TokenKind.INT_LIT && this.cur.intVal === 0) {
                func.isPureVirtual = true;
                this.advance();
            }
            else {
                this.error("expected '0' after '=' for pure virtual function");
            }
        }
        if (!isOperator && !func.isPureVirtual && this.match(ast_1.TokenKind.COLON)) {
            func.initList = [];
            while (!this.check(ast_1.TokenKind.LBRACE) && !this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.EOF)) {
                if (this.cur.kind === ast_1.TokenKind.IDENT) {
                    const fieldName = this.cur.lexeme;
                    this.advance();
                    if (this.match(ast_1.TokenKind.LPAREN)) {
                        const initExpr = this.parseExpr();
                        this.expect(ast_1.TokenKind.RPAREN);
                        func.initList.push({ name: fieldName, expr: initExpr });
                    }
                    else if (this.match(ast_1.TokenKind.ASSIGN)) {
                        const initExpr = this.parseExpr();
                        func.initList.push({ name: fieldName, expr: initExpr });
                    }
                    else {
                        this.error(`expected '(' or '=' after field name '${fieldName}' in initializer list`);
                    }
                }
                else {
                    this.error(`expected field name in initializer list, got '${(0, ast_1.tokenName)(this.cur.kind)}'`);
                    this.advance();
                }
                if (!this.match(ast_1.TokenKind.COMMA)) {
                    break;
                }
            }
        }
        if (isExtern || func.isPureVirtual) {
            this.expect(ast_1.TokenKind.SEMICOLON);
        }
        else {
            func.body = this.parseBlock();
        }
        return func;
    }
    parseEnumDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        if (!this.expectIdent()) {
            return null;
        }
        this.expect(ast_1.TokenKind.LBRACE);
        const e = new ast_1.AstNode(ast_1.AstNodeKind.ENUM_DEF, line, col);
        e.className = name;
        if (!this.check(ast_1.TokenKind.RBRACE)) {
            do {
                const vname = this.cur.lexeme;
                if (!this.expectIdent()) {
                    continue;
                }
                let init;
                if (this.match(ast_1.TokenKind.ASSIGN)) {
                    init = this.parseExpr();
                }
                e.variants.push({ name: vname, init });
            } while (this.match(ast_1.TokenKind.COMMA));
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return e;
    }
    parseUnionDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        if (!this.expectIdent()) {
            return null;
        }
        this.expect(ast_1.TokenKind.LBRACE);
        const u = new ast_1.AstNode(ast_1.AstNodeKind.UNION_DEF, line, col);
        u.className = name;
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const fname = this.cur.lexeme;
            if (!this.expectIdent()) {
                while (!this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.EOF) && !this.check(ast_1.TokenKind.RBRACE)) {
                    this.advance();
                }
                if (!this.check(ast_1.TokenKind.RBRACE)) {
                    this.advance();
                }
                continue;
            }
            this.expect(ast_1.TokenKind.COLON);
            const ftype = this.parseType();
            this.expect(ast_1.TokenKind.SEMICOLON);
            u.fields.push({ name: fname, typeName: ftype });
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return u;
    }
    parseClassDef(classConsumed = false) {
        const line = this.cur.line;
        const col = this.cur.col;
        if (!classConsumed) {
            this.advance();
        }
        const name = this.cur.lexeme;
        if (!this.expectIdent()) {
            return null;
        }
        if (this.classNames.has(name)) {
            this.error(`class '${name}' is already defined`);
        }
        this.classNames.add(name);
        let baseName = '';
        let baseAccess = '';
        if (this.match(ast_1.TokenKind.LPAREN)) {
            if (this.cur.kind !== ast_1.TokenKind.IDENT) {
                this.error("expected base class name after '('");
                return null;
            }
            baseName = this.cur.lexeme;
            this.advance();
            if (!this.classNames.has(baseName)) {
                this.error(`base class '${baseName}' is not defined (forward declaration not supported)`);
            }
            if (this.match(ast_1.TokenKind.COLON)) {
                if (this.cur.kind === ast_1.TokenKind.PUBLIC || this.cur.kind === ast_1.TokenKind.PRIVATE || this.cur.kind === ast_1.TokenKind.PROTECTED) {
                    baseAccess = (0, ast_1.tokenName)(this.cur.kind);
                    this.advance();
                }
                else {
                    this.error("expected 'public', 'private', or 'protected' after ':' in base class declaration");
                    return null;
                }
            }
            this.expect(ast_1.TokenKind.RPAREN);
        }
        this.expect(ast_1.TokenKind.LBRACE);
        const c = new ast_1.AstNode(ast_1.AstNodeKind.CLASS_DEF, line, col);
        c.className = name;
        c.baseName = baseName || undefined;
        c.baseAccess = baseAccess || undefined;
        this.classBaseMap.set(name, baseName);
        let curAccess = 'public';
        const fieldNames = new Set();
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            if (this.match(ast_1.TokenKind.PUBLIC)) {
                this.expect(ast_1.TokenKind.COLON);
                curAccess = 'public';
            }
            else if (this.match(ast_1.TokenKind.PRIVATE)) {
                this.expect(ast_1.TokenKind.COLON);
                curAccess = 'private';
            }
            else if (this.match(ast_1.TokenKind.PROTECTED)) {
                this.expect(ast_1.TokenKind.COLON);
                curAccess = 'protected';
            }
            else {
                let matchedVirtual = this.match(ast_1.TokenKind.VIRTUAL);
                let matchedOverride = false;
                if (!matchedVirtual) {
                    matchedOverride = this.match(ast_1.TokenKind.OVERRIDE);
                }
                let matchedStatic = false;
                if (!matchedVirtual && !matchedOverride) {
                    matchedStatic = this.match(ast_1.TokenKind.STATIC);
                }
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
                            if (!this.classVirtualMethods.has(name)) {
                                this.classVirtualMethods.set(name, new Set());
                            }
                            this.classVirtualMethods.get(name).add(method.funcName || '');
                        }
                        if (method.isPureVirtual) {
                            if (!this.classVirtualMethods.has(name)) {
                                this.classVirtualMethods.set(name, new Set());
                            }
                            this.classVirtualMethods.get(name).add(method.funcName || '');
                        }
                        if (matchedOverride && !method.isPureVirtual) {
                            if (!this.classVirtualMethods.has(name)) {
                                this.classVirtualMethods.set(name, new Set());
                            }
                            this.classVirtualMethods.get(name).add(method.funcName || '');
                        }
                        if (!method.isOperator) {
                            if (!this.classMethodNames.has(name)) {
                                this.classMethodNames.set(name, new Set());
                            }
                            if (this.classMethodNames.get(name).has(method.funcName || '')) {
                                this.error(`method '${method.funcName}' is already defined in class '${name}'`);
                            }
                            this.classMethodNames.get(name).add(method.funcName || '');
                        }
                        if (method.funcName === name) {
                            c.constructors.push(method);
                        }
                        else {
                            c.methods.push(method);
                        }
                    }
                }
                else if (this.match(ast_1.TokenKind.BIT_NOT)) {
                    const dline = this.cur.line;
                    const dcol = this.cur.col;
                    const dname = this.cur.lexeme;
                    if (!this.expectIdent()) {
                        continue;
                    }
                    if (dname !== name) {
                        this.error(`destructor name '${dname}' must match class name '${name}'`);
                        if (this.match(ast_1.TokenKind.LPAREN)) {
                            this.match(ast_1.TokenKind.RPAREN);
                        }
                        if (this.check(ast_1.TokenKind.LBRACE)) {
                            this.parseBlock();
                        }
                        continue;
                    }
                    this.expect(ast_1.TokenKind.LPAREN);
                    this.expect(ast_1.TokenKind.RPAREN);
                    const dtor = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, dline, dcol);
                    dtor.funcName = '~' + name;
                    dtor.returnType = 'void';
                    dtor.classNameForFunc = name;
                    dtor.access = curAccess;
                    dtor.body = this.parseBlock();
                    c.destructor = dtor;
                }
                else if (this.match(ast_1.TokenKind.CLASS)) {
                    const nested = this.parseClassDef(true);
                    if (nested) {
                        const nestedName = nested.className || '';
                        if (nestedName.indexOf('::') === -1) {
                            nested.className = name + '::' + nestedName;
                        }
                        c.nestedClasses.push(nested);
                    }
                }
                else if (this.isTypeToken(this.cur.kind)) {
                    if (this.cur.kind === ast_1.TokenKind.IDENT && this.lexer.peekToken?.kind === ast_1.TokenKind.COLON) {
                        const fname = this.cur.lexeme;
                        this.advance();
                        if (fieldNames.has(fname)) {
                            this.error(`field '${fname}' is already defined in class '${name}'`);
                        }
                        fieldNames.add(fname);
                        this.expect(ast_1.TokenKind.COLON);
                        const ftype = this.parseType();
                        let init;
                        if (this.match(ast_1.TokenKind.ASSIGN)) {
                            init = this.parseExpr();
                        }
                        this.expect(ast_1.TokenKind.SEMICOLON);
                        c.fields.push({ name: fname, typeName: ftype, init, access: curAccess });
                    }
                    else {
                        const method = this.parseFuncDef(false);
                        if (method) {
                            method.classNameForFunc = name;
                            method.access = curAccess;
                            if (method.funcName === name) {
                                c.constructors.push(method);
                            }
                            else {
                                if (!method.isOperator) {
                                    if (!this.classMethodNames.has(name)) {
                                        this.classMethodNames.set(name, new Set());
                                    }
                                    if (this.classMethodNames.get(name).has(method.funcName || '')) {
                                        this.error(`method '${method.funcName}' is already defined in class '${name}'`);
                                    }
                                    this.classMethodNames.get(name).add(method.funcName || '');
                                }
                                c.methods.push(method);
                            }
                        }
                    }
                }
                else if (this.isKeywordToken(this.cur.kind)) {
                    this.error(`keyword '${(0, ast_1.tokenName)(this.cur.kind)}' cannot be used as a class member name`);
                    this.advance();
                }
                else {
                    this.error(`expected field, method, or access specifier in class '${name}', got '${(0, ast_1.tokenName)(this.cur.kind)}'`);
                    this.advance();
                }
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        this.match(ast_1.TokenKind.SEMICOLON);
        return c;
    }
    parseNamespaceDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        if (!this.expectIdent()) {
            return null;
        }
        const n = new ast_1.AstNode(ast_1.AstNodeKind.NAMESPACE_DEF, line, col);
        n.className = name;
        this.expect(ast_1.TokenKind.LBRACE);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const decl = this.parseDecl();
            if (decl) {
                n.decls.push(decl);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return n;
    }
    parseTemplateDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        if (!this.match(ast_1.TokenKind.DOLLAR)) {
            this.errorExpected("'$' after 'template'");
            return null;
        }
        const typeParams = [];
        do {
            const tp = { name: '', isType: false };
            const tpName = this.cur.lexeme;
            if (!this.expectIdent()) {
                return null;
            }
            tp.name = tpName;
            if (this.match(ast_1.TokenKind.COLON)) {
                if (this.match(ast_1.TokenKind.TYPENAME)) {
                    tp.isType = true;
                }
                else {
                    tp.typeName = this.parseType();
                    if (!tp.typeName) {
                        this.error("expected type after ':' in template parameter");
                        return null;
                    }
                }
            }
            else {
                tp.isType = true;
            }
            if (this.match(ast_1.TokenKind.ASSIGN)) {
                if (tp.isType) {
                    const defaultType = this.parseType();
                    if (!defaultType) {
                        this.error("expected default type after '=' in template parameter");
                        return null;
                    }
                    tp.typeName = defaultType;
                }
                else {
                    const defaultVal = this.parseExpr();
                    if (!defaultVal) {
                        this.error("expected default value after '=' in template parameter");
                        return null;
                    }
                }
            }
            typeParams.push(tp);
        } while (this.match(ast_1.TokenKind.COMMA));
        if (!this.match(ast_1.TokenKind.DOLLAR)) {
            this.errorExpected("'$' after template parameters");
            return null;
        }
        const def = this.parseDecl();
        if (!def) {
            this.error('expected declaration after template');
            return null;
        }
        const node = new ast_1.AstNode(ast_1.AstNodeKind.TEMPLATE_DEF, line, col);
        node.templateParams = typeParams;
        node.templateBody = def;
        return node;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map