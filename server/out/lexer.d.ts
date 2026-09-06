import { Token } from './ast';
export interface SkippedRange {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
}
export declare class Lexer {
    private source;
    private pos;
    private line;
    private col;
    private bol;
    private tokens;
    private tokenPos;
    private macros;
    private condStack;
    skippedRanges: {
        startLine: number;
        startCol: number;
        endLine: number;
        endCol: number;
    }[];
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
    private isMacroDefined;
    private collectMacros;
    private preprocessToken;
    private rawToken;
    private tokenize;
    peekToken(): Token;
    nextToken(): Token;
    getAllTokens(): Token[];
}
//# sourceMappingURL=lexer.d.ts.map