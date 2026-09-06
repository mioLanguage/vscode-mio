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
    TokenKind[TokenKind["WHILE"] = 13] = "WHILE";
    TokenKind[TokenKind["FOR"] = 14] = "FOR";
    TokenKind[TokenKind["BREAK"] = 15] = "BREAK";
    TokenKind[TokenKind["CONTINUE"] = 16] = "CONTINUE";
    TokenKind[TokenKind["GOTO"] = 17] = "GOTO";
    TokenKind[TokenKind["RETURN"] = 18] = "RETURN";
    TokenKind[TokenKind["ENUM"] = 19] = "ENUM";
    TokenKind[TokenKind["UNION"] = 20] = "UNION";
    TokenKind[TokenKind["CLASS"] = 21] = "CLASS";
    TokenKind[TokenKind["NAMESPACE"] = 22] = "NAMESPACE";
    TokenKind[TokenKind["PUBLIC"] = 23] = "PUBLIC";
    TokenKind[TokenKind["PRIVATE"] = 24] = "PRIVATE";
    TokenKind[TokenKind["PROTECTED"] = 25] = "PROTECTED";
    TokenKind[TokenKind["VIRTUAL"] = 26] = "VIRTUAL";
    TokenKind[TokenKind["OVERRIDE"] = 27] = "OVERRIDE";
    TokenKind[TokenKind["STATIC"] = 28] = "STATIC";
    TokenKind[TokenKind["OPERATOR"] = 29] = "OPERATOR";
    TokenKind[TokenKind["TRUE"] = 30] = "TRUE";
    TokenKind[TokenKind["FALSE"] = 31] = "FALSE";
    TokenKind[TokenKind["THIS"] = 32] = "THIS";
    TokenKind[TokenKind["AT_IF"] = 33] = "AT_IF";
    TokenKind[TokenKind["AT_ELIF"] = 34] = "AT_ELIF";
    TokenKind[TokenKind["AT_ELSE"] = 35] = "AT_ELSE";
    TokenKind[TokenKind["AT_END"] = 36] = "AT_END";
    TokenKind[TokenKind["AT_MACRO"] = 37] = "AT_MACRO";
    TokenKind[TokenKind["I8"] = 38] = "I8";
    TokenKind[TokenKind["I16"] = 39] = "I16";
    TokenKind[TokenKind["I32"] = 40] = "I32";
    TokenKind[TokenKind["I64"] = 41] = "I64";
    TokenKind[TokenKind["I128"] = 42] = "I128";
    TokenKind[TokenKind["U8"] = 43] = "U8";
    TokenKind[TokenKind["U16"] = 44] = "U16";
    TokenKind[TokenKind["U32"] = 45] = "U32";
    TokenKind[TokenKind["U64"] = 46] = "U64";
    TokenKind[TokenKind["U128"] = 47] = "U128";
    TokenKind[TokenKind["USIZE"] = 48] = "USIZE";
    TokenKind[TokenKind["ISIZE"] = 49] = "ISIZE";
    TokenKind[TokenKind["F32"] = 50] = "F32";
    TokenKind[TokenKind["F64"] = 51] = "F64";
    TokenKind[TokenKind["BOOL"] = 52] = "BOOL";
    TokenKind[TokenKind["CHAR"] = 53] = "CHAR";
    TokenKind[TokenKind["VOID"] = 54] = "VOID";
    TokenKind[TokenKind["PLUS"] = 55] = "PLUS";
    TokenKind[TokenKind["MINUS"] = 56] = "MINUS";
    TokenKind[TokenKind["STAR"] = 57] = "STAR";
    TokenKind[TokenKind["SLASH"] = 58] = "SLASH";
    TokenKind[TokenKind["PERCENT"] = 59] = "PERCENT";
    TokenKind[TokenKind["ASSIGN"] = 60] = "ASSIGN";
    TokenKind[TokenKind["PLUS_ASSIGN"] = 61] = "PLUS_ASSIGN";
    TokenKind[TokenKind["MINUS_ASSIGN"] = 62] = "MINUS_ASSIGN";
    TokenKind[TokenKind["STAR_ASSIGN"] = 63] = "STAR_ASSIGN";
    TokenKind[TokenKind["SLASH_ASSIGN"] = 64] = "SLASH_ASSIGN";
    TokenKind[TokenKind["PERCENT_ASSIGN"] = 65] = "PERCENT_ASSIGN";
    TokenKind[TokenKind["AND_ASSIGN"] = 66] = "AND_ASSIGN";
    TokenKind[TokenKind["OR_ASSIGN"] = 67] = "OR_ASSIGN";
    TokenKind[TokenKind["XOR_ASSIGN"] = 68] = "XOR_ASSIGN";
    TokenKind[TokenKind["LSHIFT_ASSIGN"] = 69] = "LSHIFT_ASSIGN";
    TokenKind[TokenKind["RSHIFT_ASSIGN"] = 70] = "RSHIFT_ASSIGN";
    TokenKind[TokenKind["EQ"] = 71] = "EQ";
    TokenKind[TokenKind["NEQ"] = 72] = "NEQ";
    TokenKind[TokenKind["LT"] = 73] = "LT";
    TokenKind[TokenKind["GT"] = 74] = "GT";
    TokenKind[TokenKind["LTE"] = 75] = "LTE";
    TokenKind[TokenKind["GTE"] = 76] = "GTE";
    TokenKind[TokenKind["DOLLAR"] = 77] = "DOLLAR";
    TokenKind[TokenKind["AND"] = 78] = "AND";
    TokenKind[TokenKind["OR"] = 79] = "OR";
    TokenKind[TokenKind["NOT"] = 80] = "NOT";
    TokenKind[TokenKind["BIT_AND"] = 81] = "BIT_AND";
    TokenKind[TokenKind["BIT_OR"] = 82] = "BIT_OR";
    TokenKind[TokenKind["BIT_XOR"] = 83] = "BIT_XOR";
    TokenKind[TokenKind["BIT_NOT"] = 84] = "BIT_NOT";
    TokenKind[TokenKind["LSHIFT"] = 85] = "LSHIFT";
    TokenKind[TokenKind["RSHIFT"] = 86] = "RSHIFT";
    TokenKind[TokenKind["LPAREN"] = 87] = "LPAREN";
    TokenKind[TokenKind["RPAREN"] = 88] = "RPAREN";
    TokenKind[TokenKind["LBRACE"] = 89] = "LBRACE";
    TokenKind[TokenKind["RBRACE"] = 90] = "RBRACE";
    TokenKind[TokenKind["LBRACKET"] = 91] = "LBRACKET";
    TokenKind[TokenKind["RBRACKET"] = 92] = "RBRACKET";
    TokenKind[TokenKind["SEMICOLON"] = 93] = "SEMICOLON";
    TokenKind[TokenKind["COLON"] = 94] = "COLON";
    TokenKind[TokenKind["DOUBLE_COLON"] = 95] = "DOUBLE_COLON";
    TokenKind[TokenKind["COMMA"] = 96] = "COMMA";
    TokenKind[TokenKind["DOT"] = 97] = "DOT";
    TokenKind[TokenKind["ARROW"] = 98] = "ARROW";
    TokenKind[TokenKind["VARARG"] = 99] = "VARARG";
    TokenKind[TokenKind["TEMPLATE"] = 100] = "TEMPLATE";
    TokenKind[TokenKind["TYPENAME"] = 101] = "TYPENAME";
    TokenKind[TokenKind["SIZEOF"] = 102] = "SIZEOF";
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
    AstNodeKind[AstNodeKind["TEMPLATE_DEF"] = 34] = "TEMPLATE_DEF";
    AstNodeKind[AstNodeKind["SIZEOF_EXPR"] = 35] = "SIZEOF_EXPR";
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