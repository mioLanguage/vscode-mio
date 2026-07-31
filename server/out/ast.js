"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstNode = exports.AstNodeKind = exports.Token = exports.TokenKind = void 0;
exports.tokenName = tokenName;
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["EOF"] = 0] = "EOF";
    TokenKind[TokenKind["ERROR"] = 1] = "ERROR";
    TokenKind[TokenKind["IDENT"] = 2] = "IDENT";
    TokenKind[TokenKind["INT_LIT"] = 3] = "INT_LIT";
    TokenKind[TokenKind["FLOAT_LIT"] = 4] = "FLOAT_LIT";
    TokenKind[TokenKind["STRING_LIT"] = 5] = "STRING_LIT";
    TokenKind[TokenKind["CHAR_LIT"] = 6] = "CHAR_LIT";
    TokenKind[TokenKind["IMPORT"] = 7] = "IMPORT";
    TokenKind[TokenKind["EXTERN"] = 8] = "EXTERN";
    TokenKind[TokenKind["VAR"] = 9] = "VAR";
    TokenKind[TokenKind["CONST"] = 10] = "CONST";
    TokenKind[TokenKind["IF"] = 11] = "IF";
    TokenKind[TokenKind["ELSE"] = 12] = "ELSE";
    TokenKind[TokenKind["ELIF"] = 13] = "ELIF";
    TokenKind[TokenKind["WHILE"] = 14] = "WHILE";
    TokenKind[TokenKind["FOR"] = 15] = "FOR";
    TokenKind[TokenKind["BREAK"] = 16] = "BREAK";
    TokenKind[TokenKind["CONTINUE"] = 17] = "CONTINUE";
    TokenKind[TokenKind["GOTO"] = 18] = "GOTO";
    TokenKind[TokenKind["RETURN"] = 19] = "RETURN";
    TokenKind[TokenKind["ENUM"] = 20] = "ENUM";
    TokenKind[TokenKind["UNION"] = 21] = "UNION";
    TokenKind[TokenKind["CLASS"] = 22] = "CLASS";
    TokenKind[TokenKind["NAMESPACE"] = 23] = "NAMESPACE";
    TokenKind[TokenKind["PUBLIC"] = 24] = "PUBLIC";
    TokenKind[TokenKind["PRIVATE"] = 25] = "PRIVATE";
    TokenKind[TokenKind["PROTECTED"] = 26] = "PROTECTED";
    TokenKind[TokenKind["VIRTUAL"] = 27] = "VIRTUAL";
    TokenKind[TokenKind["OVERRIDE"] = 28] = "OVERRIDE";
    TokenKind[TokenKind["STATIC"] = 29] = "STATIC";
    TokenKind[TokenKind["OPERATOR"] = 30] = "OPERATOR";
    TokenKind[TokenKind["TRUE"] = 31] = "TRUE";
    TokenKind[TokenKind["FALSE"] = 32] = "FALSE";
    TokenKind[TokenKind["THIS"] = 33] = "THIS";
    TokenKind[TokenKind["MACRO"] = 34] = "MACRO";
    TokenKind[TokenKind["AT_IF"] = 35] = "AT_IF";
    TokenKind[TokenKind["AT_ELIF"] = 36] = "AT_ELIF";
    TokenKind[TokenKind["AT_ELSE"] = 37] = "AT_ELSE";
    TokenKind[TokenKind["AT_END"] = 38] = "AT_END";
    TokenKind[TokenKind["I8"] = 39] = "I8";
    TokenKind[TokenKind["I16"] = 40] = "I16";
    TokenKind[TokenKind["I32"] = 41] = "I32";
    TokenKind[TokenKind["I64"] = 42] = "I64";
    TokenKind[TokenKind["I128"] = 43] = "I128";
    TokenKind[TokenKind["U8"] = 44] = "U8";
    TokenKind[TokenKind["U16"] = 45] = "U16";
    TokenKind[TokenKind["U32"] = 46] = "U32";
    TokenKind[TokenKind["U64"] = 47] = "U64";
    TokenKind[TokenKind["U128"] = 48] = "U128";
    TokenKind[TokenKind["USIZE"] = 49] = "USIZE";
    TokenKind[TokenKind["ISIZE"] = 50] = "ISIZE";
    TokenKind[TokenKind["F32"] = 51] = "F32";
    TokenKind[TokenKind["F64"] = 52] = "F64";
    TokenKind[TokenKind["BOOL"] = 53] = "BOOL";
    TokenKind[TokenKind["CHAR"] = 54] = "CHAR";
    TokenKind[TokenKind["VOID"] = 55] = "VOID";
    TokenKind[TokenKind["PLUS"] = 56] = "PLUS";
    TokenKind[TokenKind["MINUS"] = 57] = "MINUS";
    TokenKind[TokenKind["STAR"] = 58] = "STAR";
    TokenKind[TokenKind["SLASH"] = 59] = "SLASH";
    TokenKind[TokenKind["PERCENT"] = 60] = "PERCENT";
    TokenKind[TokenKind["ASSIGN"] = 61] = "ASSIGN";
    TokenKind[TokenKind["PLUS_ASSIGN"] = 62] = "PLUS_ASSIGN";
    TokenKind[TokenKind["MINUS_ASSIGN"] = 63] = "MINUS_ASSIGN";
    TokenKind[TokenKind["STAR_ASSIGN"] = 64] = "STAR_ASSIGN";
    TokenKind[TokenKind["SLASH_ASSIGN"] = 65] = "SLASH_ASSIGN";
    TokenKind[TokenKind["PERCENT_ASSIGN"] = 66] = "PERCENT_ASSIGN";
    TokenKind[TokenKind["AND_ASSIGN"] = 67] = "AND_ASSIGN";
    TokenKind[TokenKind["OR_ASSIGN"] = 68] = "OR_ASSIGN";
    TokenKind[TokenKind["XOR_ASSIGN"] = 69] = "XOR_ASSIGN";
    TokenKind[TokenKind["LSHIFT_ASSIGN"] = 70] = "LSHIFT_ASSIGN";
    TokenKind[TokenKind["RSHIFT_ASSIGN"] = 71] = "RSHIFT_ASSIGN";
    TokenKind[TokenKind["EQ"] = 72] = "EQ";
    TokenKind[TokenKind["NEQ"] = 73] = "NEQ";
    TokenKind[TokenKind["LT"] = 74] = "LT";
    TokenKind[TokenKind["GT"] = 75] = "GT";
    TokenKind[TokenKind["LTE"] = 76] = "LTE";
    TokenKind[TokenKind["GTE"] = 77] = "GTE";
    TokenKind[TokenKind["DOLLAR"] = 78] = "DOLLAR";
    TokenKind[TokenKind["AND"] = 79] = "AND";
    TokenKind[TokenKind["OR"] = 80] = "OR";
    TokenKind[TokenKind["NOT"] = 81] = "NOT";
    TokenKind[TokenKind["BIT_AND"] = 82] = "BIT_AND";
    TokenKind[TokenKind["BIT_OR"] = 83] = "BIT_OR";
    TokenKind[TokenKind["BIT_XOR"] = 84] = "BIT_XOR";
    TokenKind[TokenKind["BIT_NOT"] = 85] = "BIT_NOT";
    TokenKind[TokenKind["LSHIFT"] = 86] = "LSHIFT";
    TokenKind[TokenKind["RSHIFT"] = 87] = "RSHIFT";
    TokenKind[TokenKind["LPAREN"] = 88] = "LPAREN";
    TokenKind[TokenKind["RPAREN"] = 89] = "RPAREN";
    TokenKind[TokenKind["LBRACE"] = 90] = "LBRACE";
    TokenKind[TokenKind["RBRACE"] = 91] = "RBRACE";
    TokenKind[TokenKind["LBRACKET"] = 92] = "LBRACKET";
    TokenKind[TokenKind["RBRACKET"] = 93] = "RBRACKET";
    TokenKind[TokenKind["SEMICOLON"] = 94] = "SEMICOLON";
    TokenKind[TokenKind["COLON"] = 95] = "COLON";
    TokenKind[TokenKind["DOUBLE_COLON"] = 96] = "DOUBLE_COLON";
    TokenKind[TokenKind["COMMA"] = 97] = "COMMA";
    TokenKind[TokenKind["DOT"] = 98] = "DOT";
    TokenKind[TokenKind["ARROW"] = 99] = "ARROW";
    TokenKind[TokenKind["VARARG"] = 100] = "VARARG";
    TokenKind[TokenKind["TEMPLATE"] = 101] = "TEMPLATE";
    TokenKind[TokenKind["TYPENAME"] = 102] = "TYPENAME";
    TokenKind[TokenKind["SIZEOF"] = 103] = "SIZEOF";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
class Token {
    constructor(kind, lexeme, line, col) {
        this.intVal = 0;
        this.floatVal = 0;
        this.charVal = '';
        this.stringVal = '';
        this.boolVal = false;
        this.kind = kind;
        this.lexeme = lexeme;
        this.line = line;
        this.col = col;
    }
}
exports.Token = Token;
function tokenName(kind) {
    const names = {
        [TokenKind.EOF]: 'EOF',
        [TokenKind.IDENT]: 'identifier',
        [TokenKind.INT_LIT]: 'integer',
        [TokenKind.FLOAT_LIT]: 'float',
        [TokenKind.STRING_LIT]: 'string',
        [TokenKind.CHAR_LIT]: 'char',
        [TokenKind.SEMICOLON]: ';',
        [TokenKind.COLON]: ':',
        [TokenKind.COMMA]: ',',
        [TokenKind.LPAREN]: '(',
        [TokenKind.RPAREN]: ')',
        [TokenKind.LBRACE]: '{',
        [TokenKind.RBRACE]: '}',
        [TokenKind.LBRACKET]: '[',
        [TokenKind.RBRACKET]: ']',
    };
    return names[kind] || TokenKind[kind];
}
var AstNodeKind;
(function (AstNodeKind) {
    AstNodeKind[AstNodeKind["PROGRAM"] = 0] = "PROGRAM";
    AstNodeKind[AstNodeKind["IMPORT"] = 1] = "IMPORT";
    AstNodeKind[AstNodeKind["VAR_DECL"] = 2] = "VAR_DECL";
    AstNodeKind[AstNodeKind["CONST_DECL"] = 3] = "CONST_DECL";
    AstNodeKind[AstNodeKind["FUNC_DEF"] = 4] = "FUNC_DEF";
    AstNodeKind[AstNodeKind["ENUM_DEF"] = 5] = "ENUM_DEF";
    AstNodeKind[AstNodeKind["UNION_DEF"] = 6] = "UNION_DEF";
    AstNodeKind[AstNodeKind["CLASS_DEF"] = 7] = "CLASS_DEF";
    AstNodeKind[AstNodeKind["NAMESPACE_DEF"] = 8] = "NAMESPACE_DEF";
    AstNodeKind[AstNodeKind["NAMESPACE_IMPORT"] = 9] = "NAMESPACE_IMPORT";
    AstNodeKind[AstNodeKind["BLOCK"] = 10] = "BLOCK";
    AstNodeKind[AstNodeKind["IF_STMT"] = 11] = "IF_STMT";
    AstNodeKind[AstNodeKind["WHILE_STMT"] = 12] = "WHILE_STMT";
    AstNodeKind[AstNodeKind["FOR_STMT"] = 13] = "FOR_STMT";
    AstNodeKind[AstNodeKind["BREAK_STMT"] = 14] = "BREAK_STMT";
    AstNodeKind[AstNodeKind["CONTINUE_STMT"] = 15] = "CONTINUE_STMT";
    AstNodeKind[AstNodeKind["GOTO_STMT"] = 16] = "GOTO_STMT";
    AstNodeKind[AstNodeKind["LABEL_STMT"] = 17] = "LABEL_STMT";
    AstNodeKind[AstNodeKind["RETURN_STMT"] = 18] = "RETURN_STMT";
    AstNodeKind[AstNodeKind["EXPR_STMT"] = 19] = "EXPR_STMT";
    AstNodeKind[AstNodeKind["BINARY_EXPR"] = 20] = "BINARY_EXPR";
    AstNodeKind[AstNodeKind["UNARY_EXPR"] = 21] = "UNARY_EXPR";
    AstNodeKind[AstNodeKind["CALL_EXPR"] = 22] = "CALL_EXPR";
    AstNodeKind[AstNodeKind["INDEX_EXPR"] = 23] = "INDEX_EXPR";
    AstNodeKind[AstNodeKind["MEMBER_EXPR"] = 24] = "MEMBER_EXPR";
    AstNodeKind[AstNodeKind["IDENT_EXPR"] = 25] = "IDENT_EXPR";
    AstNodeKind[AstNodeKind["INT_LIT"] = 26] = "INT_LIT";
    AstNodeKind[AstNodeKind["FLOAT_LIT"] = 27] = "FLOAT_LIT";
    AstNodeKind[AstNodeKind["STRING_LIT"] = 28] = "STRING_LIT";
    AstNodeKind[AstNodeKind["BOOL_LIT"] = 29] = "BOOL_LIT";
    AstNodeKind[AstNodeKind["CHAR_LIT"] = 30] = "CHAR_LIT";
    AstNodeKind[AstNodeKind["ARRAY_LIT"] = 31] = "ARRAY_LIT";
    AstNodeKind[AstNodeKind["CAST_EXPR"] = 32] = "CAST_EXPR";
    AstNodeKind[AstNodeKind["ASSIGN_EXPR"] = 33] = "ASSIGN_EXPR";
    AstNodeKind[AstNodeKind["MACRO_DEF"] = 34] = "MACRO_DEF";
    AstNodeKind[AstNodeKind["TEMPLATE_DEF"] = 35] = "TEMPLATE_DEF";
    AstNodeKind[AstNodeKind["SIZEOF_EXPR"] = 36] = "SIZEOF_EXPR";
})(AstNodeKind || (exports.AstNodeKind = AstNodeKind = {}));
class AstNode {
    constructor(kind, line, col) {
        // Program
        this.decls = [];
        this.params = [];
        this.isExtern = false;
        this.isStatic = false;
        this.isVirtual = false;
        this.isOverride = false;
        this.isPureVirtual = false;
        this.isVariadic = false;
        this.isOperator = false;
        this.fields = [];
        this.methods = [];
        this.constructors = [];
        this.nestedClasses = [];
        this.variants = [];
        // Template
        this.templateParams = [];
        // Block
        this.stmts = [];
        this.isScope = false;
        this.elifBlocks = [];
        this.args = [];
        this.arrow = false;
        // Array literal
        this.arrayElements = [];
        this.kind = kind;
        this.line = line;
        this.col = col;
    }
}
exports.AstNode = AstNode;
//# sourceMappingURL=ast.js.map