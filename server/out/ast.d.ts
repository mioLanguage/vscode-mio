export declare enum TokenKind {
    EOF = 0,
    ERROR = 1,
    IDENT = 2,
    INT_LIT = 3,
    FLOAT_LIT = 4,
    STRING_LIT = 5,
    CHAR_LIT = 6,
    IMPORT = 7,
    EXTERN = 8,
    VAR = 9,
    CONST = 10,
    IF = 11,
    ELSE = 12,
    ELIF = 13,
    WHILE = 14,
    FOR = 15,
    BREAK = 16,
    CONTINUE = 17,
    GOTO = 18,
    RETURN = 19,
    STRUCT = 20,
    ENUM = 21,
    UNION = 22,
    CLASS = 23,
    NAMESPACE = 24,
    PUBLIC = 25,
    PRIVATE = 26,
    PROTECTED = 27,
    VIRTUAL = 28,
    OVERRIDE = 29,
    STATIC = 30,
    OPERATOR = 31,
    TRUE = 32,
    FALSE = 33,
    THIS = 34,
    MACRO = 35,
    AT_IF = 36,
    AT_ELIF = 37,
    AT_ELSE = 38,
    AT_END = 39,
    I8 = 40,
    I16 = 41,
    I32 = 42,
    I64 = 43,
    I128 = 44,
    U8 = 45,
    U16 = 46,
    U32 = 47,
    U64 = 48,
    U128 = 49,
    USIZE = 50,
    ISIZE = 51,
    F32 = 52,
    F64 = 53,
    BOOL = 54,
    CHAR = 55,
    VOID = 56,
    PLUS = 57,
    MINUS = 58,
    STAR = 59,
    SLASH = 60,
    PERCENT = 61,
    ASSIGN = 62,
    EQ = 63,
    NEQ = 64,
    LT = 65,
    GT = 66,
    LTE = 67,
    GTE = 68,
    AND = 69,
    OR = 70,
    NOT = 71,
    BIT_AND = 72,
    BIT_OR = 73,
    BIT_XOR = 74,
    BIT_NOT = 75,
    LSHIFT = 76,
    RSHIFT = 77,
    LPAREN = 78,
    RPAREN = 79,
    LBRACE = 80,
    RBRACE = 81,
    LBRACKET = 82,
    RBRACKET = 83,
    SEMICOLON = 84,
    COLON = 85,
    DOUBLE_COLON = 86,
    COMMA = 87,
    DOT = 88,
    ARROW = 89,
    VARARG = 90,
    TEMPLATE = 91,
    TYPENAME = 92
}
export declare class Token {
    kind: TokenKind;
    lexeme: string;
    line: number;
    col: number;
    intVal: number;
    floatVal: number;
    charVal: string;
    stringVal: string;
    boolVal: boolean;
    constructor(kind: TokenKind, lexeme: string, line: number, col: number);
}
export declare function tokenName(kind: TokenKind): string;
export declare enum AstNodeKind {
    PROGRAM = 0,
    IMPORT = 1,
    VAR_DECL = 2,
    CONST_DECL = 3,
    FUNC_DEF = 4,
    STRUCT_DEF = 5,
    ENUM_DEF = 6,
    UNION_DEF = 7,
    CLASS_DEF = 8,
    NAMESPACE_DEF = 9,
    BLOCK = 10,
    IF_STMT = 11,
    WHILE_STMT = 12,
    FOR_STMT = 13,
    BREAK_STMT = 14,
    CONTINUE_STMT = 15,
    GOTO_STMT = 16,
    LABEL_STMT = 17,
    RETURN_STMT = 18,
    EXPR_STMT = 19,
    BINARY_EXPR = 20,
    UNARY_EXPR = 21,
    CALL_EXPR = 22,
    INDEX_EXPR = 23,
    MEMBER_EXPR = 24,
    IDENT_EXPR = 25,
    INT_LIT = 26,
    FLOAT_LIT = 27,
    STRING_LIT = 28,
    BOOL_LIT = 29,
    CHAR_LIT = 30,
    CAST_EXPR = 31,
    ASSIGN_EXPR = 32,
    MACRO_DEF = 33,
    TEMPLATE_DEF = 34
}
export interface Param {
    name: string;
    typeName: string;
    defaultVal?: AstNode;
}
export interface Field {
    name: string;
    typeName: string;
}
export interface Variant {
    name: string;
    value?: AstNode;
}
export interface TemplateParam {
    name: string;
    isType: boolean;
    typeName?: string;
}
export declare class AstNode {
    kind: AstNodeKind;
    line: number;
    col: number;
    typeName?: string;
    returnType?: string;
    decls: AstNode[];
    importPath?: string;
    varName?: string;
    varType?: string;
    initExpr?: AstNode;
    funcName?: string;
    params: Param[];
    body?: AstNode;
    isExtern: boolean;
    isStatic: boolean;
    isVirtual: boolean;
    isOverride: boolean;
    structName?: string;
    fields: Field[];
    methods: AstNode[];
    variants: Variant[];
    baseName?: string;
    baseAccess?: string;
    templateParams: TemplateParam[];
    templateBody?: AstNode;
    macroName?: string;
    stmts: AstNode[];
    condition?: AstNode;
    thenBlock?: AstNode;
    elifBlocks: {
        condition: AstNode;
        body: AstNode;
    }[];
    elseBlock?: AstNode;
    forInit?: AstNode;
    forUpdate?: AstNode;
    labelName?: string;
    returnExpr?: AstNode;
    left?: AstNode;
    op?: string;
    right?: AstNode;
    operand?: AstNode;
    callee?: AstNode;
    args: AstNode[];
    indexExpr?: AstNode;
    memberName?: string;
    arrow: boolean;
    identName?: string;
    intVal?: number;
    floatVal?: number;
    stringVal?: string;
    boolVal?: boolean;
    charVal?: string;
    castType?: string;
    constructor(kind: AstNodeKind, line: number, col: number);
}
//# sourceMappingURL=ast.d.ts.map