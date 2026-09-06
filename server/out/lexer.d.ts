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
    errors: string[];
    constructor(source: string);
    private collectMacros;
    get peekToken(): Token;
    getAllTokens(): Token[];
    nextToken(): Token;
    isTemplateInstantiation(): boolean;
    private cur;
    private advance;
    private peek;
    private skipWhitespace;
    private isAlpha;
    private isDigit;
    private isAlnum;
    private isHexDigit;
    private isMacroDefined;
    private addMacro;
    private readIdent;
    private readNumber;
    private readString;
    private readChar;
    private readAtDirective;
    private preprocessToken;
    private rawToken;
    private tokenize;
}
//# sourceMappingURL=lexer.d.ts.map