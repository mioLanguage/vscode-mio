"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolTable = void 0;
const ast_1 = require("./ast");
class SymbolTable {
    constructor(parent) {
        this.symbols = new Map();
        this.types = new Map();
        this.namespaces = new Map();
        this.parent = parent;
    }
    add(name, info) {
        if (!this.symbols.has(name)) {
            this.symbols.set(name, info);
        }
    }
    addType(name, info) {
        if (!this.types.has(name)) {
            this.types.set(name, info);
        }
    }
    get(name) {
        const sym = this.symbols.get(name);
        if (sym) {
            return sym;
        }
        for (const [, ns] of this.namespaces) {
            const nsSym = ns.symbols.get(name);
            if (nsSym) {
                return nsSym;
            }
        }
        return this.parent?.get(name);
    }
    getType(name) {
        const ty = this.types.get(name);
        if (ty) {
            return ty;
        }
        for (const [, ns] of this.namespaces) {
            const nsTy = ns.types.get(name);
            if (nsTy) {
                return nsTy;
            }
        }
        return this.parent?.getType(name);
    }
    getAllSymbols() {
        const result = [];
        for (const [, sym] of this.symbols) {
            result.push(sym);
        }
        return result;
    }
    getAllTypes() {
        const result = [];
        for (const [, sym] of this.types) {
            result.push(sym);
        }
        return result;
    }
    setFilePath(filePath) {
        for (const [, sym] of this.symbols) {
            sym.filePath = filePath;
        }
        for (const [, sym] of this.types) {
            sym.filePath = filePath;
        }
        for (const [, ns] of this.namespaces) {
            ns.setFilePath(filePath);
        }
    }
    mergeInto(target) {
        for (const [name, sym] of this.symbols) {
            target.symbols.set(name, sym);
        }
        for (const [name, sym] of this.types) {
            target.types.set(name, sym);
        }
        for (const [name, ns] of this.namespaces) {
            target.namespaces.set(name, ns);
        }
    }
    collectFromAst(ast, currentNamespace) {
        for (const decl of ast.decls) {
            this.collectDecl(decl, currentNamespace);
        }
    }
    collectDecl(decl, currentNamespace) {
        switch (decl.kind) {
            case ast_1.AstNodeKind.FUNC_DEF:
                this.collectFunction(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.VAR_DECL:
                this.collectVariable(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.CONST_DECL:
                this.collectConstant(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.ENUM_DEF:
                this.collectEnum(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.UNION_DEF:
                this.collectUnion(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.CLASS_DEF:
                this.collectClass(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.NAMESPACE_DEF:
                this.collectNamespace(decl);
                break;
            case ast_1.AstNodeKind.NAMESPACE_IMPORT:
                // Namespace imports are not collected for completion
                break;
            case ast_1.AstNodeKind.TEMPLATE_DEF:
                this.collectTemplate(decl, currentNamespace);
                break;
            case ast_1.AstNodeKind.IMPORT:
                // Imports are not collected for completion
                break;
            default:
                break;
        }
    }
    collectFunction(decl, currentNamespace) {
        if (!decl.funcName) {
            return;
        }
        const name = decl.funcName;
        const info = {
            name,
            kind: 'function',
            returnType: decl.returnType,
            params: decl.params,
            line: decl.line,
            col: decl.col,
        };
        this.add(name, info);
        if (decl.body) {
            this.collectStmts(decl.body.stmts);
        }
    }
    collectStmts(stmts) {
        for (const stmt of stmts) {
            switch (stmt.kind) {
                case ast_1.AstNodeKind.VAR_DECL:
                    this.collectVariable(stmt);
                    break;
                case ast_1.AstNodeKind.CONST_DECL:
                    this.collectConstant(stmt);
                    break;
                case ast_1.AstNodeKind.IF_STMT:
                    if (stmt.thenBlock) {
                        this.collectStmts(stmt.thenBlock.stmts);
                    }
                    if (stmt.elseBlock) {
                        this.collectStmts(stmt.elseBlock.stmts);
                    }
                    break;
                case ast_1.AstNodeKind.WHILE_STMT:
                    if (stmt.thenBlock) {
                        this.collectStmts(stmt.thenBlock.stmts);
                    }
                    break;
                case ast_1.AstNodeKind.FOR_STMT:
                    if (stmt.thenBlock) {
                        this.collectStmts(stmt.thenBlock.stmts);
                    }
                    break;
                case ast_1.AstNodeKind.BLOCK:
                    if (stmt.stmts) {
                        this.collectStmts(stmt.stmts);
                    }
                    break;
                default:
                    break;
            }
        }
    }
    collectVariable(decl, currentNamespace) {
        if (!decl.varName) {
            return;
        }
        this.add(decl.varName, {
            name: decl.varName,
            kind: 'variable',
            typeName: decl.varType,
            line: decl.line,
            col: decl.col,
        });
    }
    collectConstant(decl, currentNamespace) {
        if (!decl.varName) {
            return;
        }
        this.add(decl.varName, {
            name: decl.varName,
            kind: 'constant',
            typeName: decl.varType,
            line: decl.line,
            col: decl.col,
        });
    }
    collectEnum(decl, currentNamespace) {
        if (!decl.className) {
            return;
        }
        const info = {
            name: decl.className,
            kind: 'enum',
            variants: decl.variants,
            line: decl.line,
            col: decl.col,
        };
        this.addType(decl.className, info);
        this.add(decl.className, info);
    }
    collectUnion(decl, currentNamespace) {
        if (!decl.className) {
            return;
        }
        const info = {
            name: decl.className,
            kind: 'union',
            fields: decl.fields,
            line: decl.line,
            col: decl.col,
        };
        this.addType(decl.className, info);
        this.add(decl.className, info);
    }
    collectClass(decl, currentNamespace) {
        if (!decl.className) {
            return;
        }
        const methods = this.collectMethods(decl.methods);
        const info = {
            name: decl.className,
            kind: 'class',
            fields: decl.fields,
            methods,
            baseName: decl.baseName,
            line: decl.line,
            col: decl.col,
        };
        this.addType(decl.className, info);
        this.add(decl.className, info);
        for (const method of methods) {
            this.add(method.name, method);
        }
    }
    collectNamespace(decl) {
        if (!decl.className) {
            return;
        }
        const ns = new SymbolTable(this);
        ns.collectFromAst(decl, decl.className);
        this.namespaces.set(decl.className, ns);
        this.add(decl.className, {
            name: decl.className,
            kind: 'namespace',
            line: decl.line,
            col: decl.col,
        });
    }
    collectTemplate(decl, currentNamespace) {
        if (decl.templateBody) {
            this.collectDecl(decl.templateBody, currentNamespace);
        }
    }
    collectMethods(methods) {
        const result = [];
        for (const method of methods) {
            if (method.funcName) {
                result.push({
                    name: method.funcName,
                    kind: 'method',
                    returnType: method.returnType,
                    params: method.params,
                    line: method.line,
                    col: method.col,
                });
            }
        }
        return result;
    }
    getNamespace(name) {
        return this.namespaces.get(name) || this.parent?.getNamespace(name);
    }
}
exports.SymbolTable = SymbolTable;
//# sourceMappingURL=symbols.js.map