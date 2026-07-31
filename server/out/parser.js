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
        this.error(`Expected ${ast_1.TokenKind[kind]}, got ${ast_1.TokenKind[this.cur.kind]} '${this.cur.lexeme}'`);
        return false;
    }
    skipToSemicolonOrBrace() {
        while (!this.check(ast_1.TokenKind.EOF) && !this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.RBRACE)) {
            this.advance();
        }
    }
    skipPastSemicolon() {
        while (!this.check(ast_1.TokenKind.EOF) && !this.check(ast_1.TokenKind.SEMICOLON)) {
            this.advance();
        }
        if (this.check(ast_1.TokenKind.SEMICOLON)) {
            this.advance();
        }
    }
    parse() {
        const program = new ast_1.AstNode(ast_1.AstNodeKind.PROGRAM, 1, 1);
        while (!this.check(ast_1.TokenKind.EOF)) {
            const decl = this.parseDecl();
            if (decl) {
                program.decls.push(decl);
            }
        }
        return program;
    }
    parseDecl() {
        switch (this.cur.kind) {
            case ast_1.TokenKind.IMPORT: return this.parseImport();
            case ast_1.TokenKind.EXTERN: return this.parseExtern();
            case ast_1.TokenKind.MACRO: return this.parseMacro();
            case ast_1.TokenKind.TEMPLATE: return this.parseTemplate();
            case ast_1.TokenKind.ENUM: return this.parseEnum();
            case ast_1.TokenKind.UNION: return this.parseUnion();
            case ast_1.TokenKind.CLASS: return this.parseClass();
            case ast_1.TokenKind.NAMESPACE: return this.parseNamespace();
            case ast_1.TokenKind.VAR: return this.parseVarDecl();
            case ast_1.TokenKind.CONST: return this.parseConstDecl();
            case ast_1.TokenKind.STATIC: return this.parseStaticFunc();
            case ast_1.TokenKind.AT_IF: return this.parseConditionalCompilation();
            case ast_1.TokenKind.IDENT:
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
                return this.parseFuncOrGlobal();
            case ast_1.TokenKind.PUBLIC:
            case ast_1.TokenKind.PRIVATE:
            case ast_1.TokenKind.PROTECTED:
            case ast_1.TokenKind.VIRTUAL:
            case ast_1.TokenKind.OVERRIDE:
                return this.parseClassMember();
            default:
                this.error(`Unexpected token '${this.cur.lexeme}' at top level`);
                this.advance();
                return null;
        }
    }
    parseImport() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip import
        const node = new ast_1.AstNode(ast_1.AstNodeKind.IMPORT, line, col);
        if (this.check(ast_1.TokenKind.STRING_LIT)) {
            node.importPath = this.cur.lexeme;
            this.advance();
        }
        else {
            let path = '';
            while (this.check(ast_1.TokenKind.IDENT)) {
                path += this.cur.lexeme;
                this.advance();
                if (this.check(ast_1.TokenKind.DOT)) {
                    path += '.';
                    this.advance();
                }
                else {
                    break;
                }
            }
            node.importPath = path;
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        // Handle comma-separated imports
        while (this.check(ast_1.TokenKind.COMMA)) {
            this.advance();
            if (this.check(ast_1.TokenKind.STRING_LIT)) {
                this.advance();
            }
            else {
                while (this.check(ast_1.TokenKind.IDENT)) {
                    this.advance();
                    if (this.check(ast_1.TokenKind.DOT)) {
                        this.advance();
                    }
                    else {
                        break;
                    }
                }
            }
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseExtern() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip extern
        const node = this.parseFuncRest(line, col);
        if (node) {
            node.isExtern = true;
            this.match(ast_1.TokenKind.SEMICOLON);
        }
        return node;
    }
    parseMacro() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip macro
        const node = new ast_1.AstNode(ast_1.AstNodeKind.MACRO_DEF, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.macroName = this.cur.lexeme;
            this.advance();
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseTemplate() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip template
        const node = new ast_1.AstNode(ast_1.AstNodeKind.TEMPLATE_DEF, line, col);
        this.match(ast_1.TokenKind.LT);
        node.templateParams = this.parseTemplateParams();
        this.match(ast_1.TokenKind.GT);
        const body = this.parseTemplateBody();
        if (body) {
            node.templateBody = body;
        }
        return node;
    }
    parseTemplateParams() {
        const params = [];
        if (this.check(ast_1.TokenKind.IDENT)) {
            params.push(this.parseTemplateParam());
            while (this.check(ast_1.TokenKind.COMMA)) {
                this.advance();
                params.push(this.parseTemplateParam());
            }
        }
        return params;
    }
    parseTemplateParam() {
        const param = { name: '', isType: true };
        if (this.check(ast_1.TokenKind.IDENT)) {
            param.name = this.cur.lexeme;
            this.advance();
        }
        if (this.check(ast_1.TokenKind.COLON)) {
            this.advance();
            if (this.check(ast_1.TokenKind.TYPENAME)) {
                this.advance();
                param.isType = true;
            }
            else if (this.check(ast_1.TokenKind.IDENT)) {
                param.typeName = this.cur.lexeme;
                this.advance();
                param.isType = false;
                if (this.check(ast_1.TokenKind.ASSIGN)) {
                    this.advance();
                    this.parseExpression(); // skip default value
                }
            }
        }
        return param;
    }
    parseTemplateBody() {
        switch (this.cur.kind) {
            case ast_1.TokenKind.IDENT:
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
                return this.parseFuncDef(this.cur.line, this.cur.col);
            default:
                this.error('Expected function after template');
                return null;
        }
    }
    parseEnum() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip enum
        const node = new ast_1.AstNode(ast_1.AstNodeKind.ENUM_DEF, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.className = this.cur.lexeme;
            this.advance();
        }
        this.expect(ast_1.TokenKind.LBRACE);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            if (this.check(ast_1.TokenKind.IDENT)) {
                const varName = this.cur.lexeme;
                const varLine = this.cur.line;
                const varCol = this.cur.col;
                this.advance();
                const variant = { name: varName };
                if (this.check(ast_1.TokenKind.ASSIGN)) {
                    this.advance();
                    variant.init = this.parsePrimary();
                }
                node.variants.push(variant);
            }
            this.match(ast_1.TokenKind.COMMA);
            this.match(ast_1.TokenKind.SEMICOLON);
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseUnion() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip union
        const node = new ast_1.AstNode(ast_1.AstNodeKind.UNION_DEF, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.className = this.cur.lexeme;
            this.advance();
        }
        this.expect(ast_1.TokenKind.LBRACE);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            if (this.check(ast_1.TokenKind.IDENT)) {
                const name = this.cur.lexeme;
                this.advance();
                if (this.check(ast_1.TokenKind.COLON)) {
                    this.advance();
                    const typeName = this.parseTypeName();
                    node.fields.push({ name, typeName });
                }
            }
            this.match(ast_1.TokenKind.SEMICOLON);
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseClass() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip class
        const node = new ast_1.AstNode(ast_1.AstNodeKind.CLASS_DEF, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.className = this.cur.lexeme;
            this.advance();
        }
        // Inheritance: class Dog(Animal:public)
        if (this.check(ast_1.TokenKind.LPAREN)) {
            this.advance();
            if (this.check(ast_1.TokenKind.IDENT)) {
                node.baseName = this.cur.lexeme;
                this.advance();
            }
            if (this.check(ast_1.TokenKind.COLON)) {
                this.advance();
                if (this.check(ast_1.TokenKind.PUBLIC) || this.check(ast_1.TokenKind.PRIVATE) || this.check(ast_1.TokenKind.PROTECTED)) {
                    node.baseAccess = this.cur.lexeme;
                    this.advance();
                }
            }
            this.expect(ast_1.TokenKind.RPAREN);
        }
        this.expect(ast_1.TokenKind.LBRACE);
        this.parseClassBody(node);
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseClassBody(node) {
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            if (this.check(ast_1.TokenKind.PUBLIC) || this.check(ast_1.TokenKind.PRIVATE) || this.check(ast_1.TokenKind.PROTECTED)) {
                this.advance();
                this.match(ast_1.TokenKind.COLON);
            }
            else if (this.check(ast_1.TokenKind.VIRTUAL)) {
                this.advance();
                const func = this.parseFuncDef(this.cur.line, this.cur.col);
                if (func) {
                    func.isVirtual = true;
                    node.methods.push(func);
                }
            }
            else if (this.check(ast_1.TokenKind.OVERRIDE)) {
                this.advance();
                const func = this.parseFuncDef(this.cur.line, this.cur.col);
                if (func) {
                    func.isOverride = true;
                    node.methods.push(func);
                }
            }
            else if (this.check(ast_1.TokenKind.STATIC)) {
                this.advance();
                const func = this.parseFuncDef(this.cur.line, this.cur.col);
                if (func) {
                    func.isStatic = true;
                    node.methods.push(func);
                }
            }
            else if (this.check(ast_1.TokenKind.IDENT)) {
                const name = this.cur.lexeme;
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                if (this.check(ast_1.TokenKind.COLON)) {
                    this.advance();
                    const typeName = this.parseTypeName();
                    node.fields.push({ name, typeName });
                    this.match(ast_1.TokenKind.SEMICOLON);
                }
                else if (this.check(ast_1.TokenKind.LPAREN)) {
                    if (name === node.className) {
                        const funcNode = this.parseConstructorRest(name, line, col);
                        if (funcNode) {
                            node.methods.push(funcNode);
                        }
                    }
                    else if (name.startsWith('~')) {
                        // Destructor
                        this.advance(); // skip (
                        this.expect(ast_1.TokenKind.RPAREN);
                        const funcNode = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
                        funcNode.funcName = name;
                        funcNode.body = this.parseBlock();
                        node.methods.push(funcNode);
                    }
                    else {
                        const funcNode = this.parseFuncRestWithName(name, line, col);
                        if (funcNode) {
                            node.methods.push(funcNode);
                        }
                    }
                }
                else {
                    this.match(ast_1.TokenKind.SEMICOLON);
                }
            }
            else if (this.isTypeToken(this.cur.kind)) {
                const func = this.parseFuncDef(this.cur.line, this.cur.col);
                if (func) {
                    node.methods.push(func);
                }
            }
            else if (this.check(ast_1.TokenKind.OPERATOR)) {
                const func = this.parseOperatorDef(this.cur.line, this.cur.col);
                if (func) {
                    node.methods.push(func);
                }
            }
            else {
                this.advance();
            }
        }
    }
    parseConstructorRest(name, line, col) {
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        node.funcName = name;
        node.returnType = name;
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            node.params = this.parseParams();
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.COLON)) {
            this.advance();
            while (!this.check(ast_1.TokenKind.LBRACE) && !this.check(ast_1.TokenKind.EOF)) {
                if (this.check(ast_1.TokenKind.IDENT)) {
                    this.advance();
                    if (this.check(ast_1.TokenKind.LPAREN)) {
                        this.advance();
                        let depth = 1;
                        while (depth > 0 && !this.check(ast_1.TokenKind.EOF)) {
                            if (this.check(ast_1.TokenKind.LPAREN)) {
                                depth++;
                            }
                            if (this.check(ast_1.TokenKind.RPAREN)) {
                                depth--;
                            }
                            if (depth > 0) {
                                this.advance();
                            }
                        }
                        this.advance();
                    }
                }
                if (this.check(ast_1.TokenKind.COMMA)) {
                    this.advance();
                }
                else {
                    break;
                }
            }
        }
        node.body = this.parseBlock();
        return node;
    }
    parseOperatorDef(line, col) {
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        this.advance();
        let op = '';
        if (this.check(ast_1.TokenKind.PLUS)) {
            op = '+';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.MINUS)) {
            op = '-';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.STAR)) {
            op = '*';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.SLASH)) {
            op = '/';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.PERCENT)) {
            op = '%';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.EQ)) {
            op = '==';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.LT)) {
            op = '<';
            this.advance();
        }
        else if (this.check(ast_1.TokenKind.GT)) {
            op = '>';
            this.advance();
        }
        node.funcName = 'operator' + op;
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            node.params = this.parseParams();
        }
        this.expect(ast_1.TokenKind.RPAREN);
        node.body = this.parseBlock();
        return node;
    }
    parseNamespace() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip namespace
        const node = new ast_1.AstNode(ast_1.AstNodeKind.NAMESPACE_DEF, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.className = this.cur.lexeme;
            this.advance();
        }
        this.expect(ast_1.TokenKind.LBRACE);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const decl = this.parseDecl();
            if (decl) {
                node.decls.push(decl);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseVarDecl() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip var
        const node = new ast_1.AstNode(ast_1.AstNodeKind.VAR_DECL, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.varName = this.cur.lexeme;
            this.advance();
        }
        if (this.check(ast_1.TokenKind.COLON)) {
            this.advance();
            node.varType = this.parseTypeName();
        }
        if (this.check(ast_1.TokenKind.ASSIGN)) {
            this.advance();
            node.initExpr = this.parseExpression();
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseConstDecl() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip const
        const node = new ast_1.AstNode(ast_1.AstNodeKind.CONST_DECL, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.varName = this.cur.lexeme;
            this.advance();
        }
        if (this.check(ast_1.TokenKind.COLON)) {
            this.advance();
            node.varType = this.parseTypeName();
        }
        if (this.check(ast_1.TokenKind.ASSIGN)) {
            this.advance();
            node.initExpr = this.parseExpression();
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseStaticFunc() {
        this.advance(); // skip static
        const node = this.parseFuncDef(this.cur.line, this.cur.col);
        if (node) {
            node.isStatic = true;
        }
        return node;
    }
    parseClassMember() {
        // This is called when we see public/private/protected/virtual/override at top level
        // It's an error, but we try to recover
        while (this.check(ast_1.TokenKind.PUBLIC) || this.check(ast_1.TokenKind.PRIVATE) ||
            this.check(ast_1.TokenKind.PROTECTED) || this.check(ast_1.TokenKind.VIRTUAL) ||
            this.check(ast_1.TokenKind.OVERRIDE)) {
            this.advance();
            if (this.check(ast_1.TokenKind.COLON)) {
                this.advance();
            }
        }
        return this.parseFuncDef(this.cur.line, this.cur.col);
    }
    parseFuncOrGlobal() {
        return this.parseFuncDef(this.cur.line, this.cur.col);
    }
    parseFuncDef(line, col) {
        const returnType = this.parseTypeName();
        if (!returnType) {
            return null;
        }
        if (this.check(ast_1.TokenKind.IDENT)) {
            const name = this.cur.lexeme;
            const nameLine = this.cur.line;
            const nameCol = this.cur.col;
            this.advance();
            if (this.check(ast_1.TokenKind.LPAREN)) {
                return this.parseFuncRestWithReturnType(returnType, name, nameLine, nameCol);
            }
            // It's a global variable declaration with type
            const node = new ast_1.AstNode(ast_1.AstNodeKind.VAR_DECL, line, col);
            node.varName = name;
            node.varType = returnType;
            if (this.check(ast_1.TokenKind.ASSIGN)) {
                this.advance();
                node.initExpr = this.parseExpression();
            }
            this.match(ast_1.TokenKind.SEMICOLON);
            return node;
        }
        return null;
    }
    parseFuncRest(line, col) {
        const returnType = this.parseTypeName();
        if (!returnType || !this.check(ast_1.TokenKind.IDENT)) {
            this.error('Expected function name');
            this.skipToSemicolonOrBrace();
            return null;
        }
        const name = this.cur.lexeme;
        const nameLine = this.cur.line;
        const nameCol = this.cur.col;
        this.advance();
        if (!this.check(ast_1.TokenKind.LPAREN)) {
            this.error('Expected ( after function name');
            return null;
        }
        return this.parseFuncRestWithReturnType(returnType, name, nameLine, nameCol);
    }
    parseFuncRestWithReturnType(returnType, name, line, col) {
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        node.funcName = name;
        node.returnType = returnType;
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            node.params = this.parseParams();
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.LBRACE)) {
            node.body = this.parseBlock();
        }
        else {
            this.match(ast_1.TokenKind.SEMICOLON);
        }
        return node;
    }
    parseFuncRestWithName(name, line, col) {
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FUNC_DEF, line, col);
        node.funcName = name;
        this.expect(ast_1.TokenKind.LPAREN);
        if (!this.check(ast_1.TokenKind.RPAREN)) {
            node.params = this.parseParams();
        }
        this.expect(ast_1.TokenKind.RPAREN);
        if (this.check(ast_1.TokenKind.LBRACE)) {
            node.body = this.parseBlock();
        }
        else {
            this.match(ast_1.TokenKind.SEMICOLON);
        }
        return node;
    }
    parseParams() {
        const params = [];
        params.push(this.parseParam());
        while (this.check(ast_1.TokenKind.COMMA)) {
            this.advance();
            params.push(this.parseParam());
        }
        return params;
    }
    parseParam() {
        const param = { name: '', typeName: '' };
        if (this.check(ast_1.TokenKind.IDENT)) {
            param.name = this.cur.lexeme;
            this.advance();
        }
        if (this.check(ast_1.TokenKind.COLON)) {
            this.advance();
            param.typeName = this.parseTypeName();
        }
        if (this.check(ast_1.TokenKind.ASSIGN)) {
            this.advance();
            param.defaultVal = this.parseExpression();
        }
        return param;
    }
    parseTypeName() {
        let name = '';
        if (this.isTypeToken(this.cur.kind) || this.check(ast_1.TokenKind.IDENT)) {
            name = this.cur.lexeme;
            this.advance();
            // Handle namespace::type
            if (this.check(ast_1.TokenKind.DOUBLE_COLON)) {
                this.advance();
                if (this.check(ast_1.TokenKind.IDENT)) {
                    name += '::' + this.cur.lexeme;
                    this.advance();
                }
            }
        }
        // Handle pointers
        while (this.check(ast_1.TokenKind.STAR)) {
            name += '*';
            this.advance();
        }
        // Handle arrays
        if (this.check(ast_1.TokenKind.LBRACKET)) {
            this.advance();
            if (this.check(ast_1.TokenKind.INT_LIT)) {
                name += '[' + this.cur.lexeme + ']';
                this.advance();
            }
            this.expect(ast_1.TokenKind.RBRACKET);
        }
        return name;
    }
    isTypeToken(kind) {
        return kind === ast_1.TokenKind.I8 || kind === ast_1.TokenKind.I16 ||
            kind === ast_1.TokenKind.I32 || kind === ast_1.TokenKind.I64 || kind === ast_1.TokenKind.I128 ||
            kind === ast_1.TokenKind.U8 || kind === ast_1.TokenKind.U16 ||
            kind === ast_1.TokenKind.U32 || kind === ast_1.TokenKind.U64 || kind === ast_1.TokenKind.U128 ||
            kind === ast_1.TokenKind.USIZE || kind === ast_1.TokenKind.ISIZE ||
            kind === ast_1.TokenKind.F32 || kind === ast_1.TokenKind.F64 ||
            kind === ast_1.TokenKind.BOOL || kind === ast_1.TokenKind.CHAR || kind === ast_1.TokenKind.VOID;
    }
    parseConditionalCompilation() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip @if
        // Skip condition expression
        if (this.check(ast_1.TokenKind.NOT)) {
            this.advance();
        }
        if (this.check(ast_1.TokenKind.IDENT)) {
            this.advance();
        }
        // Skip until @end
        let depth = 1;
        while (depth > 0 && !this.check(ast_1.TokenKind.EOF)) {
            if (this.check(ast_1.TokenKind.AT_IF)) {
                depth++;
            }
            if (this.check(ast_1.TokenKind.AT_END)) {
                depth--;
            }
            this.advance();
        }
        return new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, line, col);
    }
    parseBlock() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.expect(ast_1.TokenKind.LBRACE);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, line, col);
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            const stmt = this.parseStmt();
            if (stmt) {
                node.stmts.push(stmt);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        return node;
    }
    parseStmt() {
        switch (this.cur.kind) {
            case ast_1.TokenKind.IF: return this.parseIfStmt();
            case ast_1.TokenKind.WHILE: return this.parseWhileStmt();
            case ast_1.TokenKind.FOR: return this.parseForStmt();
            case ast_1.TokenKind.BREAK: return this.parseBreakStmt();
            case ast_1.TokenKind.CONTINUE: return this.parseContinueStmt();
            case ast_1.TokenKind.GOTO: return this.parseGotoStmt();
            case ast_1.TokenKind.RETURN: return this.parseReturnStmt();
            case ast_1.TokenKind.LBRACE: return this.parseBlock();
            case ast_1.TokenKind.COLON: return this.parseLabelStmt();
            case ast_1.TokenKind.VAR: return this.parseVarDecl();
            case ast_1.TokenKind.CONST: return this.parseConstDecl();
            case ast_1.TokenKind.SEMICOLON:
                this.advance();
                return null;
            default:
                return this.parseExprStmt();
        }
    }
    parseIfStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip if
        this.match(ast_1.TokenKind.COLON);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.IF_STMT, line, col);
        node.condition = this.parseExpression();
        node.thenBlock = this.parseBlockOrStmt();
        while (this.check(ast_1.TokenKind.ELIF)) {
            this.advance();
            this.match(ast_1.TokenKind.COLON);
            const elifCond = this.parseExpression();
            const elifBody = this.parseBlockOrStmt();
            node.elifBlocks.push({ condition: elifCond, body: elifBody });
        }
        if (this.check(ast_1.TokenKind.ELSE)) {
            this.advance();
            node.elseBlock = this.parseBlockOrStmt();
        }
        return node;
    }
    parseBlockOrStmt() {
        if (this.check(ast_1.TokenKind.LBRACE)) {
            return this.parseBlock();
        }
        const stmt = this.parseStmt();
        if (stmt) {
            return stmt;
        }
        return new ast_1.AstNode(ast_1.AstNodeKind.BLOCK, this.cur.line, this.cur.col);
    }
    parseWhileStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip while
        this.match(ast_1.TokenKind.COLON);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.WHILE_STMT, line, col);
        node.condition = this.parseExpression();
        node.thenBlock = this.parseBlockOrStmt();
        return node;
    }
    parseForStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip for
        this.match(ast_1.TokenKind.COLON);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.FOR_STMT, line, col);
        if (!this.check(ast_1.TokenKind.SEMICOLON)) {
            node.forInit = this.parseExpression();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.SEMICOLON)) {
            node.condition = this.parseExpression();
        }
        this.expect(ast_1.TokenKind.SEMICOLON);
        if (!this.check(ast_1.TokenKind.LBRACE)) {
            node.forUpdate = this.parseExpression();
        }
        node.thenBlock = this.parseBlockOrStmt();
        return node;
    }
    parseBreakStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.match(ast_1.TokenKind.SEMICOLON);
        return new ast_1.AstNode(ast_1.AstNodeKind.BREAK_STMT, line, col);
    }
    parseContinueStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        this.match(ast_1.TokenKind.SEMICOLON);
        return new ast_1.AstNode(ast_1.AstNodeKind.CONTINUE_STMT, line, col);
    }
    parseGotoStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.GOTO_STMT, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.labelName = this.cur.lexeme;
            this.advance();
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseLabelStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip :
        const node = new ast_1.AstNode(ast_1.AstNodeKind.LABEL_STMT, line, col);
        if (this.check(ast_1.TokenKind.IDENT)) {
            node.labelName = this.cur.lexeme;
            this.advance();
        }
        return node;
    }
    parseReturnStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance();
        const node = new ast_1.AstNode(ast_1.AstNodeKind.RETURN_STMT, line, col);
        if (!this.check(ast_1.TokenKind.SEMICOLON) && !this.check(ast_1.TokenKind.RBRACE)) {
            node.returnExpr = this.parseExpression();
        }
        this.match(ast_1.TokenKind.SEMICOLON);
        return node;
    }
    parseExprStmt() {
        const line = this.cur.line;
        const col = this.cur.col;
        const expr = this.parseExpression();
        this.match(ast_1.TokenKind.SEMICOLON);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.EXPR_STMT, line, col);
        node.left = expr;
        return node;
    }
    // Expression parsing with precedence
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        const left = this.parseOr();
        if (this.check(ast_1.TokenKind.ASSIGN)) {
            const line = this.cur.line;
            const col = this.cur.col;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.ASSIGN_EXPR, line, col);
            node.left = left;
            node.right = this.parseAssignment();
            return node;
        }
        return left;
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.check(ast_1.TokenKind.OR)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseAnd();
            left = node;
        }
        return left;
    }
    parseAnd() {
        let left = this.parseBitOr();
        while (this.check(ast_1.TokenKind.AND)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseBitOr();
            left = node;
        }
        return left;
    }
    parseBitOr() {
        let left = this.parseBitXor();
        while (this.check(ast_1.TokenKind.BIT_OR)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseBitXor();
            left = node;
        }
        return left;
    }
    parseBitXor() {
        let left = this.parseBitAnd();
        while (this.check(ast_1.TokenKind.BIT_XOR)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseBitAnd();
            left = node;
        }
        return left;
    }
    parseBitAnd() {
        let left = this.parseEquality();
        while (this.check(ast_1.TokenKind.BIT_AND)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseEquality();
            left = node;
        }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (this.check(ast_1.TokenKind.EQ) || this.check(ast_1.TokenKind.NEQ)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseComparison();
            left = node;
        }
        return left;
    }
    parseComparison() {
        let left = this.parseShift();
        while (this.check(ast_1.TokenKind.LT) || this.check(ast_1.TokenKind.GT) ||
            this.check(ast_1.TokenKind.LTE) || this.check(ast_1.TokenKind.GTE)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseShift();
            left = node;
        }
        return left;
    }
    parseShift() {
        let left = this.parseAddSub();
        while (this.check(ast_1.TokenKind.LSHIFT) || this.check(ast_1.TokenKind.RSHIFT)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseAddSub();
            left = node;
        }
        return left;
    }
    parseAddSub() {
        let left = this.parseMulDiv();
        while (this.check(ast_1.TokenKind.PLUS) || this.check(ast_1.TokenKind.MINUS)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseMulDiv();
            left = node;
        }
        return left;
    }
    parseMulDiv() {
        let left = this.parseUnary();
        while (this.check(ast_1.TokenKind.STAR) || this.check(ast_1.TokenKind.SLASH) || this.check(ast_1.TokenKind.PERCENT)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.BINARY_EXPR, line, col);
            node.left = left;
            node.op = op;
            node.right = this.parseUnary();
            left = node;
        }
        return left;
    }
    parseUnary() {
        if (this.check(ast_1.TokenKind.MINUS) || this.check(ast_1.TokenKind.NOT) ||
            this.check(ast_1.TokenKind.BIT_NOT) || this.check(ast_1.TokenKind.BIT_AND) ||
            this.check(ast_1.TokenKind.STAR)) {
            const line = this.cur.line;
            const col = this.cur.col;
            const op = this.cur.lexeme;
            const kind = this.cur.kind;
            this.advance();
            const node = new ast_1.AstNode(ast_1.AstNodeKind.UNARY_EXPR, line, col);
            node.op = op;
            node.operand = this.parseUnary();
            return node;
        }
        return this.parsePostfix();
    }
    parsePostfix() {
        let left = this.parsePrimary();
        while (true) {
            if (this.check(ast_1.TokenKind.LPAREN)) {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.CALL_EXPR, line, col);
                node.callee = left;
                if (!this.check(ast_1.TokenKind.RPAREN)) {
                    node.args.push(this.parseExpression());
                    while (this.check(ast_1.TokenKind.COMMA)) {
                        this.advance();
                        node.args.push(this.parseExpression());
                    }
                }
                this.expect(ast_1.TokenKind.RPAREN);
                left = node;
            }
            else if (this.check(ast_1.TokenKind.LBRACKET)) {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.INDEX_EXPR, line, col);
                node.left = left;
                node.indexExpr = this.parseExpression();
                this.expect(ast_1.TokenKind.RBRACKET);
                left = node;
            }
            else if (this.check(ast_1.TokenKind.DOT)) {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, line, col);
                node.left = left;
                if (this.check(ast_1.TokenKind.IDENT)) {
                    node.memberName = this.cur.lexeme;
                    this.advance();
                }
                left = node;
            }
            else if (this.check(ast_1.TokenKind.ARROW)) {
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, line, col);
                node.left = left;
                node.arrow = true;
                if (this.check(ast_1.TokenKind.IDENT)) {
                    node.memberName = this.cur.lexeme;
                    this.advance();
                }
                left = node;
            }
            else if (this.check(ast_1.TokenKind.DOUBLE_COLON)) {
                // Namespace access, treat as member
                const line = this.cur.line;
                const col = this.cur.col;
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.MEMBER_EXPR, line, col);
                node.left = left;
                if (this.check(ast_1.TokenKind.IDENT)) {
                    node.memberName = this.cur.lexeme;
                    this.advance();
                }
                left = node;
            }
            else {
                break;
            }
        }
        return left;
    }
    parsePrimary() {
        const line = this.cur.line;
        const col = this.cur.col;
        // Cast expression: type(expr)
        if (this.isTypeToken(this.cur.kind)) {
            const typeName = this.cur.lexeme;
            const typeLine = this.cur.line;
            const typeCol = this.cur.col;
            this.advance();
            if (this.check(ast_1.TokenKind.LPAREN)) {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.CAST_EXPR, typeLine, typeCol);
                node.castType = typeName;
                node.left = this.parseExpression();
                this.expect(ast_1.TokenKind.RPAREN);
                return node;
            }
            // It's just an identifier named like a type
            const identNode = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, typeLine, typeCol);
            identNode.identName = typeName;
            return identNode;
        }
        switch (this.cur.kind) {
            case ast_1.TokenKind.INT_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
                node.intVal = this.cur.lexeme ? parseInt(this.cur.lexeme) : 0;
                return node;
            }
            case ast_1.TokenKind.FLOAT_LIT: {
                this.advance();
                const node = new ast_1.AstNode(ast_1.AstNodeKind.FLOAT_LIT, line, col);
                return node;
            }
            case ast_1.TokenKind.STRING_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.STRING_LIT, line, col);
                node.stringVal = this.cur.lexeme;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.CHAR_LIT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.CHAR_LIT, line, col);
                node.charVal = this.cur.charVal;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.TRUE:
            case ast_1.TokenKind.FALSE: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.BOOL_LIT, line, col);
                node.boolVal = this.cur.kind === ast_1.TokenKind.TRUE;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.IDENT: {
                const node = new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
                node.identName = this.cur.lexeme;
                this.advance();
                return node;
            }
            case ast_1.TokenKind.LPAREN: {
                this.advance();
                const expr = this.parseExpression();
                this.expect(ast_1.TokenKind.RPAREN);
                return expr;
            }
            case ast_1.TokenKind.LBRACKET: {
                // Array literal: {1, 2, 3}
                return this.parseArrayLiteral();
            }
            case ast_1.TokenKind.LBRACE: {
                return this.parseBlock();
            }
            default:
                this.error(`Unexpected token '${this.cur.lexeme}' in expression`);
                this.advance();
                return new ast_1.AstNode(ast_1.AstNodeKind.IDENT_EXPR, line, col);
        }
    }
    parseArrayLiteral() {
        const line = this.cur.line;
        const col = this.cur.col;
        this.advance(); // skip {
        let count = 0;
        while (!this.check(ast_1.TokenKind.RBRACE) && !this.check(ast_1.TokenKind.EOF)) {
            this.parseExpression();
            count++;
            if (!this.check(ast_1.TokenKind.RBRACE)) {
                this.match(ast_1.TokenKind.COMMA);
            }
        }
        this.expect(ast_1.TokenKind.RBRACE);
        const node = new ast_1.AstNode(ast_1.AstNodeKind.INT_LIT, line, col);
        node.intVal = count;
        return node;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map