"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const ast_1 = require("./ast");
const lexer_1 = require("./lexer");
class Parser {
    constructor(source) {
        this.errors = [];
        this.lexer = new lexer_1.Lexer(source);
        this.cur = this.lexer.nextToken();
    }
    getErrors() {
        return this.errors;
    }
    getSkippedRanges() {
        return this.lexer.skippedRanges;
    }
    error(msg) {
        this.errors.push(`Line ${this.cur.line}:${this.cur.col}: ${msg}`);
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
        this.error(`Expected '${ast_1.TokenKind[kind]}', got '${ast_1.TokenKind[this.cur.kind]}'`);
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
    parse() {
        const program = new ast_1.AstNode(ast_1.AstNodeKind.PROGRAM, 1, 1);
        while (!this.check(ast_1.TokenKind.EOF)) {
            while (this.match(ast_1.TokenKind.SEMICOLON)) { }
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
                this.error(`Expected declaration, got '${ast_1.TokenKind[this.cur.kind]}'`);
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
            const node = new ast_1.AstNode(ast_1.AstNodeKind.NAMESPACE_IMPORT, line, col);
            node.namespaceImportName = this.cur.lexeme;
            this.advance();
            return node;
        }
        return null;
    }
    parseTypeName() {
        let typeName = '';
        if (this.match(ast_1.TokenKind.STAR)) {
            typeName = '*' + this.parseTypeName();
            return typeName;
        }
        if (this.match(ast_1.TokenKind.BIT_AND)) {
            if (this.match(ast_1.TokenKind.BIT_AND)) {
                return '&&' + this.parseTypeName();
            }
            return '&' + this.parseTypeName();
        }
        if (this.match(ast_1.TokenKind.AND)) {
            return '&&' + this.parseTypeName();
        }
        if (this.check(ast_1.TokenKind.IDENT)) {
            typeName = this.cur.lexeme;
            this.advance();
            if (this.match(ast_1.TokenKind.DOUBLE_COLON)) {
                typeName += '::' + this.cur.lexeme;
                this.advance();
            }
            if (this.match(ast_1.TokenKind.DOLLAR)) {
                typeName += '$';
                do {
                    typeName += this.parseTypeName();
                } while (this.match(ast_1.TokenKind.COMMA));
                this.expect(ast_1.TokenKind.DOLLAR);
                typeName += '$';
            }
        }
        else {
            switch (this.cur.kind) {
                case ast_1.TokenKind.I8:
                    typeName = 'i8';
                    this.advance();
                    break;
                case ast_1.TokenKind.I16:
                    typeName = 'i16';
                    this.advance();
                    break;
                case ast_1.TokenKind.I32:
                    typeName = 'i32';
                    this.advance();
                    break;
                case ast_1.TokenKind.I64:
                    typeName = 'i64';
                    this.advance();
                    break;
                case ast_1.TokenKind.I128:
                    typeName = 'i128';
                    this.advance();
                    break;
                case ast_1.TokenKind.U8:
                    typeName = 'u8';
                    this.advance();
                    break;
                case ast_1.TokenKind.U16:
                    typeName = 'u16';
                    this.advance();
                    break;
                case ast_1.TokenKind.U32:
                    typeName = 'u32';
                    this.advance();
                    break;
                case ast_1.TokenKind.U64:
                    typeName = 'u64';
                    this.advance();
                    break;
                case ast_1.TokenKind.U128:
                    typeName = 'u128';
                    this.advance();
                    break;
                case ast_1.TokenKind.USIZE:
                    typeName = 'usize';
                    this.advance();
                    break;
                case ast_1.TokenKind.ISIZE:
                    typeName = 'isize';
                    this.advance();
                    break;
                case ast_1.TokenKind.F32:
                    typeName = 'f32';
                    this.advance();
                    break;
                case ast_1.TokenKind.F64:
                    typeName = 'f64';
                    this.advance();
                    break;
                case ast_1.TokenKind.BOOL:
                    typeName = 'bool';
                    this.advance();
                    break;
                case ast_1.TokenKind.CHAR:
                    typeName = 'char';
                    this.advance();
                    break;
                case ast_1.TokenKind.VOID:
                    typeName = 'void';
                    this.advance();
                    break;
                default:
                    this.error('Expected type');
                    typeName = '';
            }
        }
        while (this.match(ast_1.TokenKind.LBRACKET)) {
            if (this.check(ast_1.TokenKind.INT_LIT)) {
                typeName += '[' + this.cur.lexeme + ']';
                this.advance();
            }
            else {
                typeName += '[]';
            }
            this.expect(ast_1.TokenKind.RBRACKET);
        }
        return typeName;
    }
    parseVarItems(isConst, isStatic, isExtern) {
        const line = this.cur.line;
        const col = this.cur.col;
        const name = this.cur.lexeme;
        this.advance();
        let typeName = '';
        let initExpr;
        if (this.match(ast_1.TokenKind.COLON)) {
            typeName = this.parseTypeName();
        }
        if (this.match(ast_1.TokenKind.ASSIGN)) {
            initExpr = this.parseExpression();
        }
        if (!typeName && !initExpr) {
            this.error(`Variable '${name}' requires a type or an initializer`);
        }
        const node = new ast_1.AstNode(isConst ? ast_1.AstNodeKind.CONST_DECL : ast_1.AstNodeKind.VAR_DECL, line, col);
        node.varName = name;
        node.varType = typeName;
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
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        let left = this.parseLogicalOr();
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
    parseEquality() {
        let left = this.parseRelational();
        while (this.check(ast_1.TokenKind.EQ) || this.check(ast_1.TokenKind.NEQ)) {
            const op = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = this.parseRelational();
            left = node;
        }
        return left;
    }
    parseRelational() {
        let left = this.parseShift();
        while (this.check(ast_1.TokenKind.LT) || this.check(ast_1.TokenKind.GT) || this.check(ast_1.TokenKind.LTE) || this.check(ast_1.TokenKind.GTE)) {
            const op = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = this.parseShift();
            left = node;
        }
        return left;
    }
    parseShift() {
        let left = this.parseAdditive();
        while (this.check(ast_1.TokenKind.LSHIFT) || this.check(ast_1.TokenKind.RSHIFT)) {
            const op = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = this.parseAdditive();
            left = node;
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.check(ast_1.TokenKind.PLUS) || this.check(ast_1.TokenKind.MINUS)) {
            const op = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = this.parseMultiplicative();
            left = node;
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.check(ast_1.TokenKind.STAR) || this.check(ast_1.TokenKind.SLASH) || this.check(ast_1.TokenKind.PERCENT)) {
            const op = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, left.line, left.col);
            node.left = left;
            node.op = ast_1.TokenKind[op];
            node.right = this.parseUnary();
            left = node;
        }
        return left;
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
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (expr.kind === ast_1.AstNodeKind.IDENT_EXPR && this.check(ast_1.TokenKind.DOLLAR)) {
                this.advance();
                const call = new ast_1.AstNode(ast_1.AstNodeKind.CALL_EXPR, expr.line, expr.col);
                call.callee = expr;
                do {
                    if (this.isTypeToken(this.cur.kind)) {
                        call.templateArgs = call.templateArgs || [];
                        call.templateArgs.push({ isType: true, typeName: this.parseTypeName() });
                    }
                    else {
                        call.templateArgs = call.templateArgs || [];
                        call.templateArgs.push({ isType: false, expr: this.parseExpression() });
                    }
                } while (this.match(ast_1.TokenKind.COMMA));
                this.expect(ast_1.TokenKind.DOLLAR);
                if (this.match(ast_1.TokenKind.LPAREN)) {
                    if (!this.check(ast_1.TokenKind.RPAREN)) {
                        call.args.push(this.parseExpression());
                        while (this.match(ast_1.TokenKind.COMMA)) {
                            call.args.push(this.parseExpression());
                        }
                    }
                    this.expect(ast_1.TokenKind.RPAREN);
                }
                expr = call;
                continue;
            }
            if (this.match(ast_1.TokenKind.LPAREN)) {
                const call = new ast_1.AstNode(ast_1.AstNodeKind.CALL_EXPR, expr.line, expr.col);
                call.callee = expr;
                if (!this.check(ast_1.TokenKind.RPAREN)) {
                    call.args.push(this.parseExpression());
                    while (this.match(ast_1.TokenKind.COMMA)) {
                        call.args.push(this.parseExpression());
                    }
                }
                this.expect(ast_1.TokenKind.RPAREN);
                expr = call;
            }
            else if (this.match(ast_1.TokenKind.LBRACKET)) {
                const index = this.parseExpression();
                this.expect(ast_1.TokenKind.RBRACKET);
                const idxNode = new ast_1.AstNode(ast_1.AstNodeKind.INDEX_EXPR, expr.line, expr.col);
                idxNode.left = expr;
                idxNode.indexExpr = index;
                expr = idxNode;
            }
            else if (this.match(ast_1.TokenKind.DOT)) {
                if (this.isKeywordToken(this.cur.kind)) {
                    this.error(`Keyword '${this.cur.lexeme}' cannot be used as a member name`);
                    break;
                }
                const member = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
                member.left = expr;
                member.memberName = this.cur.lexeme;
                member.arrow = false;
                this.advance();
                expr = member;
            }
            else if (this.match(ast_1.TokenKind.ARROW)) {
                if (this.isKeywordToken(this.cur.kind)) {
                    this.error(`Keyword '${this.cur.lexeme}' cannot be used as a member name`);
                    break;
                }
                const member = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, expr.line, expr.col);
                member.left = expr;
                member.memberName = this.cur.lexeme;
                member.arrow = true;
                this.advance();
                expr = member;
            }
            else {
                break;
            }
        }
        return expr;
    }
    parsePrimary() {
        const line = this.cur.line;
        const col = this.cur.col;
        switch (this.cur.kind) {
            case ast_1.TokenKind.INT_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
                node.intVal = this.cur.intVal;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.FLOAT_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.FLOAT_LIT, line, col);
                node.floatVal = this.cur.floatVal;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.STRING_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.STRING_LIT, line, col);
                node.stringVal = this.cur.stringVal;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.CHAR_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.CHAR_LIT, line, col);
                node.charVal = this.cur.charVal;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.SIZEOF: {
                this.advance();
                this.expect(ast_1.TokenKind.LPAREN);
                const typeName = this.parseTypeName();
                this.expect(ast_1.TokenKind.RPAREN);
                const node = new ast_1.AstNode(ast_1.AstNodeKind.SIZEOF_EXPR, line, col);
                node.sizeofTargetType = typeName;
                return node;
            }
            case ast_1.TokenKind.TRUE: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BOOL_LIT, line, col);
                node.boolVal = true;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.FALSE: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BOOL_LIT, line, col);
                node.boolVal = false;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.THIS: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                node.identName = 'this';
                return node;
            }
            case ast_1.TokenKind.IDENT: {
                const name = this.cur.lexeme;
                this.advance();
                if (this.check(ast_1.TokenKind.STAR) && this.lexer.peekToken().kind === ast_1.TokenKind.LPAREN) {
                    this.advance();
                    this.advance();
                    const expr = this.parseExpression();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, line, col);
                    node.castType = '*' + name;
                    node.left = expr;
                    return node;
                }
                if (this.match(ast_1.TokenKind.DOUBLE_COLON)) {
                    const nsNode = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                    nsNode.identName = this.cur.lexeme;
                    nsNode.namespaceName = name;
                    this.advance();
                    return nsNode;
                }
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                node.identName = name;
                return node;
            }
            case ast_1.TokenKind.DOUBLE_COLON: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                node.identName = this.cur.lexeme;
                node.namespaceName = '::';
                this.advance();
                return node;
            }
            case ast_1.TokenKind.LPAREN: {
                this.advance();
                const expr = this.parseExpression();
                this.expect(ast_1.TokenKind.RPAREN);
                return expr;
            }
            case ast_1.TokenKind.LBRACE: {
                this.advance();
                const arr = new ast_1.AstNode(ast_1.AstNodeKind.ARRAY_LIT, line, col);
                if (!this.check(ast_1.TokenKind.RBRACE)) {
                    arr.arrayElements.push(this.parseExpression());
                    while (this.match(ast_1.TokenKind.COMMA)) {
                        if (this.check(ast_1.TokenKind.RBRACE)) {
                            break;
                        }
                        arr.arrayElements.push(this.parseExpression());
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
                const typeName = this.parseTypeName();
                if (this.check(ast_1.TokenKind.STAR) && this.lexer.peekToken().kind === ast_1.TokenKind.LPAREN) {
                    this.advance();
                    this.advance();
                    const expr = this.parseExpression();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, line, col);
                    node.castType = '*' + typeName;
                    node.left = expr;
                    return node;
                }
                if (this.check(ast_1.TokenKind.LPAREN)) {
                    this.advance();
                    const expr = this.parseExpression();
                    this.expect(ast_1.TokenKind.RPAREN);
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, line, col);
                    node.castType = typeName;
                    node.left = expr;
                    return node;
                }
                this.error('Expected expression');
                return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
            }
            default:
                this.error(`Expected expression, got '${ast_1.TokenKind[this.cur.kind]}'`);
                this.advance();
                return new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
        }
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
    parseIfStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.LPAREN);
        const cond = this.parseExpression();
        this.expect(ast_1.TokenKind.RPAREN);
        const thenBody = this.parseStmt();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.IF_STMT, line, col);
        node.condition = cond;
        node.thenBlock = thenBody || undefined;
        if (this.match(ast_1.TokenKind.ELSE)) {
            node.elseBlock = this.parseStmt() || undefined;
        }
        return node;
    }
    parseWhileStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.LPAREN);
        const cond = this.parseExpression();
        this.expect(ast_1.TokenKind.RPAREN);
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
            init = this.parseExpression();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.SEMICOLON)) {
            cond = this.parseExpression();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            update = this.parseExpression();
        }
        this.expect(ast_1.TokenKind.RPAREN);
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
            value = this.parseExpression();
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
            case ast_1.TokenKind.BREAK: {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                this.expect(ast_1.TokenKind.SEMICOLON);
                return new ast_1.AstNode(ast_1.AstNodeKind.BREAK_STMT, line, col);
            }
            case ast_1.TokenKind.CONTINUE: {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                this.expect(ast_1.TokenKind.SEMICOLON);
                return new ast_1.AstNode(ast_1.AstNodeKind.CONTINUE_STMT, line, col);
            }
            case ast_1.TokenKind.GOTO: {
                this.advance();
                const line = this.cur.line;
                const col = this.cur.col;
                const label = this.cur.lexeme;
                this.advance();
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
                this.advance();
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
                const expr = this.parseExpression();
                if (!expr) {
                    return null;
                }
                if (this.match(ast_1.TokenKind.SEMICOLON)) {
                    const node = new ast_1.AstNode(ast_1.AstNodeKind.EXPR_STMT, expr.line, expr.col);
                    node.left = expr;
                    return node;
                }
                return new ast_1.AstNode(ast_1.AstNodeKind.RETURN_STMT, expr.line, expr.col);
            }
        }
    }
    parseFuncDef(isStatic, isExtern = false) {
        const line = this.cur.line;
        const col = this.cur.col;
        const returnType = this.parseTypeName();
        let isOperator = false;
        let funcName = '';
        let opName = '';
        if (this.match(ast_1.TokenKind.OPERATOR)) {
            isOperator = true;
            opName = this.cur.lexeme;
            funcName = 'operator' + opName;
            if (this.check(ast_1.TokenKind.LBRACKET)) {
                this.advance();
                this.expect(ast_1.TokenKind.RBRACKET);
                opName = '[]';
                funcName = 'operator[]';
            }
            else {
                this.advance();
            }
        }
        else if (this.check(ast_1.TokenKind.IDENT)) {
            funcName = this.cur.lexeme;
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.LPAREN)) {
            funcName = returnType;
        }
        else if (this.isKeywordToken(this.cur.kind)) {
            this.error(`Keyword '${this.cur.lexeme}' cannot be used as a function name`);
            return null;
        }
        else {
            this.error('Expected function name');
            return null;
        }
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        node.funcName = funcName;
        node.returnType = returnType;
        node.isStatic = isStatic;
        node.isOperator = isOperator;
        if (isOperator) {
            node.opName = opName;
        }
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            do {
                if (this.match(ast_1.TokenKind.VARARG)) {
                    node.isVariadic = true;
                    break;
                }
                const pname = this.cur.lexeme;
                this.advance();
                this.expect(ast_1.TokenKind.COLON);
                const ptype = this.parseTypeName();
                let defaultVal;
                if (this.match(ast_1.TokenKind.ASSIGN)) {
                    defaultVal = this.parseExpression();
                }
                node.params.push({ name: pname, typeName: ptype, defaultVal });
            } while (this.match(ast_1.TokenKind.COMMA));
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.match(ast_1.TokenKind.ASSIGN)) {
            if (this.check(ast_1.TokenKind.INT_LIT) && this.cur.intVal === 0) {
                node.isPureVirtual = true;
                this.advance();
            }
            else {
                this.error("Expected '0' after '=' for pure virtual function");
            }
        }
        if (!isOperator && !node.isPureVirtual && this.match(ast_1.TokenKind.COLON)) {
            while (!this.check(ast_1.TokenKind.LBRACE) && !this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.EOF)) {
                if (this.check(ast_1.TokenKind.IDENT)) {
                    const fieldName = this.cur.lexeme;
                    this.advance();
                    if (this.match(ast_1.TokenKind.LPAREN)) {
                        const initExpr = this.parseExpression();
                        this.expect(ast_1.TokenKind.RPAREN);
                        if (!node.initList) {
                            node.initList = [];
                        }
                        node.initList.push({ name: fieldName, expr: initExpr });
                    }
                    else if (this.match(ast_1.TokenKind.ASSIGN)) {
                        const initExpr = this.parseExpression();
                        if (!node.initList) {
                            node.initList = [];
                        }
                        node.initList.push({ name: fieldName, expr: initExpr });
                    }
                    else {
                        this.error(`Expected '(' or '=' after field name '${fieldName}' in initializer list`);
                    }
                }
                if (!this.match(ast_1.TokenKind.COMMA)) {
                    break;
                }
            }
        }
        node.isExtern = isExtern;
        if (isExtern || node.isPureVirtual) {
            this.expect(ast_1.TokenKind.SEMICOLON);
        }
        else {
            node.body = this.parseBlock();
        }
        return node;
    }
    parseEnumDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        this.advance();
        this.expect(ast_1.TokenKind.LBRACE);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.ENUM_DEF, line, col);
        node.className = name;
        if (!this.check(ast_1.TokenKind.RBRACE)) {
            do {
                const vname = this.cur.lexeme;
                this.advance();
                let init;
                if (this.match(ast_1.TokenKind.ASSIGN)) {
                    init = this.parseExpression();
                }
                node.variants.push({ name: vname, init });
            } while (this.match(ast_1.TokenKind.COMMA));
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseUnionDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        this.advance();
        this.expect(ast_1.TokenKind.LBRACE);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.UNION_DEF, line, col);
        node.className = name;
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const fname = this.cur.lexeme;
            this.advance();
            this.expect(ast_1.TokenKind.COLON);
            const ftype = this.parseTypeName();
            this.expect(ast_1.TokenKind.SEMICOLON);
            node.fields.push({ name: fname, typeName: ftype });
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseClassDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        this.advance();
        let baseName = '';
        let baseAccess = '';
        if (this.match(ast_1.TokenKind.LPAREN)) {
            baseName = this.cur.lexeme;
            this.advance();
            if (this.match(ast_1.TokenKind.COLON)) {
                if (this.check(ast_1.TokenKind.PUBLIC) || this.check(ast_1.TokenKind.PRIVATE) || this.check(ast_1.TokenKind.PROTECTED)) {
                    baseAccess = this.cur.lexeme;
                    this.advance();
                }
            }
            this.expect(ast_1.TokenKind.RPAREN);
        }
        this.expect(ast_1.TokenKind.LBRACE);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.CLASS_DEF, line, col);
        node.className = name;
        node.baseName = baseName;
        node.baseAccess = baseAccess;
        let curAccess = 'public';
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
                        if (method.funcName === name) {
                            node.constructors.push(method);
                        }
                        else {
                            node.methods.push(method);
                        }
                    }
                }
                else if (this.match(ast_1.TokenKind.BIT_NOT)) {
                    const dline = this.cur.line;
                    const dcol = this.cur.col;
                    const dname = this.cur.lexeme;
                    this.advance();
                    if (dname !== name) {
                        this.error(`Destructor name '${dname}' must match class name '${name}'`);
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
                    node.destructor = dtor;
                }
                else if (this.match(ast_1.TokenKind.CLASS)) {
                    this.expect(ast_1.TokenKind.LBRACE);
                    const nestedLine = this.cur.line;
                    const nestedCol = this.cur.col;
                    const nestedStmt = this.parseStmt();
                    if (nestedStmt) {
                        node.stmts.push(nestedStmt);
                    }
                }
                else if (this.isTypeToken(this.cur.kind)) {
                    if (this.check(ast_1.TokenKind.IDENT) && this.lexer.peekToken().kind === ast_1.TokenKind.COLON) {
                        const fname = this.cur.lexeme;
                        this.advance();
                        this.expect(ast_1.TokenKind.COLON);
                        const ftype = this.parseTypeName();
                        let init;
                        if (this.match(ast_1.TokenKind.ASSIGN)) {
                            init = this.parseExpression();
                        }
                        this.expect(ast_1.TokenKind.SEMICOLON);
                        node.fields.push({ name: fname, typeName: ftype, init, access: curAccess });
                    }
                    else {
                        const method = this.parseFuncDef(false);
                        if (method) {
                            method.classNameForFunc = name;
                            method.access = curAccess;
                            if (method.funcName === name) {
                                node.constructors.push(method);
                            }
                            else {
                                node.methods.push(method);
                            }
                        }
                    }
                }
                else if (this.isKeywordToken(this.cur.kind)) {
                    this.error(`Keyword '${this.cur.lexeme}' cannot be used as a class member name`);
                    this.advance();
                }
                else {
                    this.error(`Expected field, method, or access specifier in class '${name}'`);
                    this.advance();
                }
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseNamespaceDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const name = this.cur.lexeme;
        this.advance();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.NAMESPACE_DEF, line, col);
        node.className = name;
        this.expect(ast_1.TokenKind.LBRACE);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const decl = this.parseDecl();
            if (decl) {
                node.stmts.push(decl);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseTemplateDef() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.expect(ast_1.TokenKind.DOLLAR);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.TEMPLATE_DEF, line, col);
        do {
            const tpName = this.cur.lexeme;
            this.advance();
            const tp = { name: tpName, isType: true };
            if (this.match(ast_1.TokenKind.COLON)) {
                if (this.match(ast_1.TokenKind.TYPENAME)) {
                    tp.isType = true;
                }
                else {
                    tp.typeName = this.parseTypeName();
                    tp.isType = false;
                }
            }
            else {
                tp.isType = true;
            }
            node.templateParams.push(tp);
        } while (this.match(ast_1.TokenKind.COMMA));
        this.expect(ast_1.TokenKind.DOLLAR);
        const body = this.parseDecl();
        if (body) {
            node.templateBody = body;
        }
        return node;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map