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
    TokenKind[TokenKind["STRUCT"] = 20] = "STRUCT";
    TokenKind[TokenKind["ENUM"] = 21] = "ENUM";
    TokenKind[TokenKind["UNION"] = 22] = "UNION";
    TokenKind[TokenKind["CLASS"] = 23] = "CLASS";
    TokenKind[TokenKind["NAMESPACE"] = 24] = "NAMESPACE";
    TokenKind[TokenKind["PUBLIC"] = 25] = "PUBLIC";
    TokenKind[TokenKind["PRIVATE"] = 26] = "PRIVATE";
    TokenKind[TokenKind["PROTECTED"] = 27] = "PROTECTED";
    TokenKind[TokenKind["VIRTUAL"] = 28] = "VIRTUAL";
    TokenKind[TokenKind["OVERRIDE"] = 29] = "OVERRIDE";
    TokenKind[TokenKind["STATIC"] = 30] = "STATIC";
    TokenKind[TokenKind["OPERATOR"] = 31] = "OPERATOR";
    TokenKind[TokenKind["TRUE"] = 32] = "TRUE";
    TokenKind[TokenKind["FALSE"] = 33] = "FALSE";
    TokenKind[TokenKind["THIS"] = 34] = "THIS";
    TokenKind[TokenKind["MACRO"] = 35] = "MACRO";
    TokenKind[TokenKind["AT_IF"] = 36] = "AT_IF";
    TokenKind[TokenKind["AT_ELIF"] = 37] = "AT_ELIF";
    TokenKind[TokenKind["AT_ELSE"] = 38] = "AT_ELSE";
    TokenKind[TokenKind["AT_END"] = 39] = "AT_END";
    TokenKind[TokenKind["I8"] = 40] = "I8";
    TokenKind[TokenKind["I16"] = 41] = "I16";
    TokenKind[TokenKind["I32"] = 42] = "I32";
    TokenKind[TokenKind["I64"] = 43] = "I64";
    TokenKind[TokenKind["I128"] = 44] = "I128";
    TokenKind[TokenKind["U8"] = 45] = "U8";
    TokenKind[TokenKind["U16"] = 46] = "U16";
    TokenKind[TokenKind["U32"] = 47] = "U32";
    TokenKind[TokenKind["U64"] = 48] = "U64";
    TokenKind[TokenKind["U128"] = 49] = "U128";
    TokenKind[TokenKind["USIZE"] = 50] = "USIZE";
    TokenKind[TokenKind["ISIZE"] = 51] = "ISIZE";
    TokenKind[TokenKind["F32"] = 52] = "F32";
    TokenKind[TokenKind["F64"] = 53] = "F64";
    TokenKind[TokenKind["BOOL"] = 54] = "BOOL";
    TokenKind[TokenKind["CHAR"] = 55] = "CHAR";
    TokenKind[TokenKind["VOID"] = 56] = "VOID";
    TokenKind[TokenKind["PLUS"] = 57] = "PLUS";
    TokenKind[TokenKind["MINUS"] = 58] = "MINUS";
    TokenKind[TokenKind["STAR"] = 59] = "STAR";
    TokenKind[TokenKind["SLASH"] = 60] = "SLASH";
    TokenKind[TokenKind["PERCENT"] = 61] = "PERCENT";
    TokenKind[TokenKind["ASSIGN"] = 62] = "ASSIGN";
    TokenKind[TokenKind["EQ"] = 63] = "EQ";
    TokenKind[TokenKind["NEQ"] = 64] = "NEQ";
    TokenKind[TokenKind["LT"] = 65] = "LT";
    TokenKind[TokenKind["GT"] = 66] = "GT";
    TokenKind[TokenKind["LTE"] = 67] = "LTE";
    TokenKind[TokenKind["GTE"] = 68] = "GTE";
    TokenKind[TokenKind["AND"] = 69] = "AND";
    TokenKind[TokenKind["OR"] = 70] = "OR";
    TokenKind[TokenKind["NOT"] = 71] = "NOT";
    TokenKind[TokenKind["BIT_AND"] = 72] = "BIT_AND";
    TokenKind[TokenKind["BIT_OR"] = 73] = "BIT_OR";
    TokenKind[TokenKind["BIT_XOR"] = 74] = "BIT_XOR";
    TokenKind[TokenKind["BIT_NOT"] = 75] = "BIT_NOT";
    TokenKind[TokenKind["LSHIFT"] = 76] = "LSHIFT";
    TokenKind[TokenKind["RSHIFT"] = 77] = "RSHIFT";
    TokenKind[TokenKind["LPAREN"] = 78] = "LPAREN";
    TokenKind[TokenKind["RPAREN"] = 79] = "RPAREN";
    TokenKind[TokenKind["LBRACE"] = 80] = "LBRACE";
    TokenKind[TokenKind["RBRACE"] = 81] = "RBRACE";
    TokenKind[TokenKind["LBRACKET"] = 82] = "LBRACKET";
    TokenKind[TokenKind["RBRACKET"] = 83] = "RBRACKET";
    TokenKind[TokenKind["SEMICOLON"] = 84] = "SEMICOLON";
    TokenKind[TokenKind["COLON"] = 85] = "COLON";
    TokenKind[TokenKind["DOUBLE_COLON"] = 86] = "DOUBLE_COLON";
    TokenKind[TokenKind["COMMA"] = 87] = "COMMA";
    TokenKind[TokenKind["DOT"] = 88] = "DOT";
    TokenKind[TokenKind["ARROW"] = 89] = "ARROW";
    TokenKind[TokenKind["VARARG"] = 90] = "VARARG";
    TokenKind[TokenKind["TEMPLATE"] = 91] = "TEMPLATE";
    TokenKind[TokenKind["TYPENAME"] = 92] = "TYPENAME";
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
    AstNodeKind[AstNodeKind["STRUCT_DEF"] = 5] = "STRUCT_DEF";
    AstNodeKind[AstNodeKind["ENUM_DEF"] = 6] = "ENUM_DEF";
    AstNodeKind[AstNodeKind["UNION_DEF"] = 7] = "UNION_DEF";
    AstNodeKind[AstNodeKind["CLASS_DEF"] = 8] = "CLASS_DEF";
    AstNodeKind[AstNodeKind["NAMESPACE_DEF"] = 9] = "NAMESPACE_DEF";
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
    AstNodeKind[AstNodeKind["CAST_EXPR"] = 31] = "CAST_EXPR";
    AstNodeKind[AstNodeKind["ASSIGN_EXPR"] = 32] = "ASSIGN_EXPR";
    AstNodeKind[AstNodeKind["MACRO_DEF"] = 33] = "MACRO_DEF";
    AstNodeKind[AstNodeKind["TEMPLATE_DEF"] = 34] = "TEMPLATE_DEF";
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
        this.fields = [];
        this.methods = [];
        this.variants = [];
        // Template
        this.templateParams = [];
        // Block
        this.stmts = [];
        this.elifBlocks = [];
        this.args = [];
        this.arrow = false;
        this.kind = kind;
        this.line = line;
        this.col = col;
    }
}
exports.AstNode = AstNode;
//# sourceMappingURL=ast.js.map