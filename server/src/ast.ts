export enum TokenKind {
	EOF = 0, ERROR, IDENT,
	INT_LIT, FLOAT_LIT, STRING_LIT, CHAR_LIT,
	IMPORT, EXTERN, VAR, CONST,
	IF, ELSE, ELIF, WHILE, FOR,
	BREAK, CONTINUE, GOTO, RETURN,
	ENUM, UNION, CLASS, NAMESPACE,
	PUBLIC, PRIVATE, PROTECTED,
	VIRTUAL, OVERRIDE, STATIC, OPERATOR,
	TRUE, FALSE, THIS, MACRO,
	AT_IF, AT_ELIF, AT_ELSE, AT_END,
	I8, I16, I32, I64, I128,
	U8, U16, U32, U64, U128,
	USIZE, ISIZE, F32, F64, BOOL, CHAR, VOID,
	PLUS, MINUS, STAR, SLASH, PERCENT,
	ASSIGN, PLUS_ASSIGN, MINUS_ASSIGN, STAR_ASSIGN, SLASH_ASSIGN, PERCENT_ASSIGN,
	AND_ASSIGN, OR_ASSIGN, XOR_ASSIGN, LSHIFT_ASSIGN, RSHIFT_ASSIGN,
	EQ, NEQ, LT, GT, LTE, GTE,
	DOLLAR,
	AND, OR, NOT,
	BIT_AND, BIT_OR, BIT_XOR, BIT_NOT,
	LSHIFT, RSHIFT,
	LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET,
	SEMICOLON, COLON, DOUBLE_COLON, COMMA, DOT, ARROW, VARARG,
	TEMPLATE, TYPENAME, SIZEOF,
}

export class Token {
	kind: TokenKind;
	lexeme: string;
	line: number;
	col: number;
	intVal: number = 0;
	floatVal: number = 0;
	charVal: string = '';
	stringVal: string = '';
	boolVal: boolean = false;

	constructor(kind: TokenKind, lexeme: string, line: number, col: number) {
		this.kind = kind;
		this.lexeme = lexeme;
		this.line = line;
		this.col = col;
	}
}

export function tokenName(kind: TokenKind): string {
	const names: Record<number, string> = {
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

export enum AstNodeKind {
	PROGRAM, IMPORT, VAR_DECL, CONST_DECL, FUNC_DEF,
	ENUM_DEF, UNION_DEF, CLASS_DEF, NAMESPACE_DEF, NAMESPACE_IMPORT,
	BLOCK, IF_STMT, WHILE_STMT, FOR_STMT,
	BREAK_STMT, CONTINUE_STMT, GOTO_STMT, LABEL_STMT, RETURN_STMT,
	EXPR_STMT, BINARY_EXPR, UNARY_EXPR, CALL_EXPR,
	INDEX_EXPR, MEMBER_EXPR, IDENT_EXPR,
	INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT, CHAR_LIT, ARRAY_LIT,
	CAST_EXPR, ASSIGN_EXPR, MACRO_DEF, TEMPLATE_DEF, SIZEOF_EXPR,
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

export class AstNode {
	kind: AstNodeKind;
	line: number;
	col: number;

	typeName?: string;
	returnType?: string;

	// Program
	decls: AstNode[] = [];

	// Import
	importPath?: string;

	// Namespace import
	namespaceImportName?: string;

	// Var/Const
	varName?: string;
	varType?: string;
	initExpr?: AstNode;

	// Func
	funcName?: string;
	params: Param[] = [];
	body?: AstNode;
	isExtern: boolean = false;
	isStatic: boolean = false;
	isVirtual: boolean = false;
	isOverride: boolean = false;
	isPureVirtual: boolean = false;
	isVariadic: boolean = false;
	isOperator: boolean = false;
	opName?: string;
	access?: string;
	initList?: { name: string; expr: AstNode }[];

	// Class/Enum/Union/Namespace
	className?: string;
	fields: Field[] = [];
	methods: AstNode[] = [];
	constructors: AstNode[] = [];
	destructor?: AstNode;
	nestedClasses: AstNode[] = [];
	variants: Variant[] = [];
	baseName?: string;
	baseAccess?: string;
	classNameForFunc?: string;

	// Template
	templateParams: TemplateParam[] = [];
	templateBody?: AstNode;

	// Macro
	macroName?: string;
	macroValue?: string;

	// Block
	stmts: AstNode[] = [];
	isScope: boolean = false;

	// If/While/For
	condition?: AstNode;
	thenBlock?: AstNode;
	elifBlocks: {condition: AstNode, body: AstNode}[] = [];
	elseBlock?: AstNode;
	forInit?: AstNode;
	forUpdate?: AstNode;

	// Label/Goto
	labelName?: string;

	// Return
	returnExpr?: AstNode;

	// Binary
	left?: AstNode;
	op?: string;
	right?: AstNode;

	// Unary
	operand?: AstNode;

	// Call
	callee?: AstNode;
	args: AstNode[] = [];
	templateArgs?: TemplateArg[];

	// Index
	indexExpr?: AstNode;

	// Member
	memberName?: string;
	arrow: boolean = false;

	// Ident
	identName?: string;
	namespaceName?: string;

	// Literals
	intVal?: number;
	floatVal?: number;
	stringVal?: string;
	boolVal?: boolean;
	charVal?: string;

	// Array literal
	arrayElements: AstNode[] = [];

	// Cast
	castType?: string;

	// Sizeof
	sizeofTargetType?: string;

	constructor(kind: AstNodeKind, line: number, col: number) {
		this.kind = kind;
		this.line = line;
		this.col = col;
	}
}