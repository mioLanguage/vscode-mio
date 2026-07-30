import { Token } from './ast';
export declare class Lexer {
    private source;
    private pos;
    private line;
    private col;
    private tokens;
    private tokenPos;
    constructor(source: string);
    private cur;
    private advance;
    private peek;
    private skipWhitespace;
    private isAlpha;
    private isDigit;
    private isAlnum;
    private isHexDigit;
    private readIdent;
    private readNumber;
    private readString;
    private readChar;
    private readAtDirective;
    private tokenize;
    peekToken(): Token;
    nextToken(): Token;
    getAllTokens(): Token[];
}
//# sourceMappingURL=lexer.d.ts.map