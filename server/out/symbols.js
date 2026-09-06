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
        this.symbols.set(name, info);
    }
    addType(name, info) {
        this.types.set(name, info);
    }
    get(name) {
        return this.symbols.get(name) || this.parent?.get(name);
    }
    getType(name) {
        return this.types.get(name) || this.parent?.getType(name);
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
        const info = {
            name: decl.className,
            kind: 'class',
            fields: decl.fields,
            methods: this.collectMethods(decl.methods),
            baseName: decl.baseName,
            line: decl.line,
            col: decl.col,
        };
        this.addType(decl.className, info);
        this.add(decl.className, info);
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