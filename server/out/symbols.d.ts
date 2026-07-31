import { AstNode, Param, Field, Variant } from './ast';
export interface SymbolInfo {
    name: string;
    kind: string;
    typeName?: string;
    returnType?: string;
    params?: Param[];
    fields?: Field[];
    methods?: SymbolInfo[];
    variants?: Variant[];
    baseName?: string;
    parentName?: string;
    line: number;
    col: number;
}
export declare class SymbolTable {
    symbols: Map<string, SymbolInfo>;
    types: Map<string, SymbolInfo>;
    namespaces: Map<string, SymbolTable>;
    private parent?;
    constructor(parent?: SymbolTable);
    add(name: string, info: SymbolInfo): void;
    addType(name: string, info: SymbolInfo): void;
    get(name: string): SymbolInfo | undefined;
    getType(name: string): SymbolInfo | undefined;
    getAllSymbols(): SymbolInfo[];
    getAllTypes(): SymbolInfo[];
    collectFromAst(ast: AstNode, currentNamespace?: string): void;
    private collectDecl;
    private collectFunction;
    private collectVariable;
    private collectConstant;
    private collectEnum;
    private collectUnion;
    private collectClass;
    private collectNamespace;
    private collectTemplate;
    private collectMethods;
    getNamespace(name: string): SymbolTable | undefined;
}
//# sourceMappingURL=symbols.d.ts.map