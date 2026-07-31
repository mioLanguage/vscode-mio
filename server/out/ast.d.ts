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
    ENUM = 20,
    UNION = 21,
    CLASS = 22,
    NAMESPACE = 23,
    PUBLIC = 24,
    PRIVATE = 25,
    PROTECTED = 26,
    VIRTUAL = 27,
    OVERRIDE = 28,
    STATIC = 29,
    OPERATOR = 30,
    TRUE = 31,
    FALSE = 32,
    THIS = 33,
    MACRO = 34,
    AT_IF = 35,
    AT_ELIF = 36,
    AT_ELSE = 37,
    AT_END = 38,
    I8 = 39,
    I16 = 40,
    I32 = 41,
    I64 = 42,
    I128 = 43,
    U8 = 44,
    U16 = 45,
    U32 = 46,
    U64 = 47,
    U128 = 48,
    USIZE = 49,
    ISIZE = 50,
    F32 = 51,
    F64 = 52,
    BOOL = 53,
    CHAR = 54,
    VOID = 55,
    PLUS = 56,
    MINUS = 57,
    STAR = 58,
    SLASH = 59,
    PERCENT = 60,
    ASSIGN = 61,
    PLUS_ASSIGN = 62,
    MINUS_ASSIGN = 63,
    STAR_ASSIGN = 64,
    SLASH_ASSIGN = 65,
    PERCENT_ASSIGN = 66,
    AND_ASSIGN = 67,
    OR_ASSIGN = 68,
    XOR_ASSIGN = 69,
    LSHIFT_ASSIGN = 70,
    RSHIFT_ASSIGN = 71,
    EQ = 72,
    NEQ = 73,
    LT = 74,
    GT = 75,
    LTE = 76,
    GTE = 77,
    DOLLAR = 78,
    AND = 79,
    OR = 80,
    NOT = 81,
    BIT_AND = 82,
    BIT_OR = 83,
    BIT_XOR = 84,
    BIT_NOT = 85,
    LSHIFT = 86,
    RSHIFT = 87,
    LPAREN = 88,
    RPAREN = 89,
    LBRACE = 90,
    RBRACE = 91,
    LBRACKET = 92,
    RBRACKET = 93,
    SEMICOLON = 94,
    COLON = 95,
    DOUBLE_COLON = 96,
    COMMA = 97,
    DOT = 98,
    ARROW = 99,
    VARARG = 100,
    TEMPLATE = 101,
    TYPENAME = 102,
    SIZEOF = 103
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
    ENUM_DEF = 5,
    UNION_DEF = 6,
    CLASS_DEF = 7,
    NAMESPACE_DEF = 8,
    NAMESPACE_IMPORT = 9,
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
    ARRAY_LIT = 31,
    CAST_EXPR = 32,
    ASSIGN_EXPR = 33,
    MACRO_DEF = 34,
    TEMPLATE_DEF = 35,
    SIZEOF_EXPR = 36
}
export interface Param {
    name: string;
    typeName: string;
    defaultVal?: AstNode;
}
export interface Field {
    name: string;
    typeName: string;
    init?: AstNode;
    access?: string;
}
export interface Variant {
    name: string;
    init?: AstNode;
}
export interface TemplateParam {
    name: string;
    isType: boolean;
    typeName?: string;
}
export interface TemplateArg {
    isType: boolean;
    typeName?: string;
    expr?: AstNode;
}
export declare class AstNode {
    kind: AstNodeKind;
    line: number;
    col: number;
    typeName?: string;
    returnType?: string;
    decls: AstNode[];
    importPath?: string;
    namespaceImportName?: string;
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
    isPureVirtual: boolean;
    isVariadic: boolean;
    isOperator: boolean;
    opName?: string;
    access?: string;
    initList?: {
        name: string;
        expr: AstNode;
    }[];
    className?: string;
    fields: Field[];
    methods: AstNode[];
    constructors: AstNode[];
    destructor?: AstNode;
    nestedClasses: AstNode[];
    variants: Variant[];
    baseName?: string;
    baseAccess?: string;
    classNameForFunc?: string;
    templateParams: TemplateParam[];
    templateBody?: AstNode;
    macroName?: string;
    macroValue?: string;
    stmts: AstNode[];
    isScope: boolean;
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
    templateArgs?: TemplateArg[];
    indexExpr?: AstNode;
    memberName?: string;
    arrow: boolean;
    identName?: string;
    namespaceName?: string;
    intVal?: number;
    floatVal?: number;
    stringVal?: string;
    boolVal?: boolean;
    charVal?: string;
    arrayElements: AstNode[];
    castType?: string;
    sizeofTargetType?: string;
    constructor(kind: AstNodeKind, line: number, col: number);
}
//# sourceMappingURL=ast.d.ts.map