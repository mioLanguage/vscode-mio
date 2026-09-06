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
    WHILE = 13,
    FOR = 14,
    BREAK = 15,
    CONTINUE = 16,
    GOTO = 17,
    RETURN = 18,
    ENUM = 19,
    UNION = 20,
    CLASS = 21,
    NAMESPACE = 22,
    PUBLIC = 23,
    PRIVATE = 24,
    PROTECTED = 25,
    VIRTUAL = 26,
    OVERRIDE = 27,
    STATIC = 28,
    OPERATOR = 29,
    TRUE = 30,
    FALSE = 31,
    THIS = 32,
    AT_IF = 33,
    AT_ELIF = 34,
    AT_ELSE = 35,
    AT_END = 36,
    AT_MACRO = 37,
    I8 = 38,
    I16 = 39,
    I32 = 40,
    I64 = 41,
    I128 = 42,
    U8 = 43,
    U16 = 44,
    U32 = 45,
    U64 = 46,
    U128 = 47,
    USIZE = 48,
    ISIZE = 49,
    F32 = 50,
    F64 = 51,
    BOOL = 52,
    CHAR = 53,
    VOID = 54,
    PLUS = 55,
    MINUS = 56,
    STAR = 57,
    SLASH = 58,
    PERCENT = 59,
    ASSIGN = 60,
    PLUS_ASSIGN = 61,
    MINUS_ASSIGN = 62,
    STAR_ASSIGN = 63,
    SLASH_ASSIGN = 64,
    PERCENT_ASSIGN = 65,
    AND_ASSIGN = 66,
    OR_ASSIGN = 67,
    XOR_ASSIGN = 68,
    LSHIFT_ASSIGN = 69,
    RSHIFT_ASSIGN = 70,
    EQ = 71,
    NEQ = 72,
    LT = 73,
    GT = 74,
    LTE = 75,
    GTE = 76,
    DOLLAR = 77,
    AND = 78,
    OR = 79,
    NOT = 80,
    BIT_AND = 81,
    BIT_OR = 82,
    BIT_XOR = 83,
    BIT_NOT = 84,
    LSHIFT = 85,
    RSHIFT = 86,
    LPAREN = 87,
    RPAREN = 88,
    LBRACE = 89,
    RBRACE = 90,
    LBRACKET = 91,
    RBRACKET = 92,
    SEMICOLON = 93,
    COLON = 94,
    DOUBLE_COLON = 95,
    COMMA = 96,
    DOT = 97,
    ARROW = 98,
    VARARG = 99,
    TEMPLATE = 100,
    TYPENAME = 101,
    SIZEOF = 102
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
    TEMPLATE_DEF = 34,
    SIZEOF_EXPR = 35
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
    stmts: AstNode[];
    isScope: boolean;
    condition?: AstNode;
    thenBlock?: AstNode;
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