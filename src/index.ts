import { parser } from "./syntax.grammar";
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  delimitedIndent,
  syntaxTree,
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { CompletionContext } from "@codemirror/autocomplete";

// https://github.com/polygolf-lang/polygolf/blob/main/src/IR/opcodes.ts
const opcodes = [
  "+",
  "-",
  "*",
  "div",
  "^",
  "mod",
  "&",
  "|",
  "~",
  "<<",
  ">>",
  "gcd",
  "min",
  "max",
  "abs",
  "read[line]",
  "@",
  "print",
  "println",
  "putc[byte]",
  "putc[codepoint]",
  "putc",
  "or",
  "and",
  "unsafe_or",
  "unsafe_and",
  "not",
  "true",
  "false",
  "<",
  "<=",
  ">=",
  ">",
  "==",
  "!=",
  "at[byte]",
  "at[codepoint]",
  "set_at",
  "slice[codepoint]",
  "slice[byte]",
  "slice",
  "ord_at[byte]",
  "ord_at[codepoint]",
  "ord_at",
  "ord[byte]",
  "ord[codepoint]",
  "ord",
  "char[byte]",
  "char[codepoint]",
  "char",
  "sorted",
  "reversed[byte]",
  "reversed[codepoint]",
  "reversed",
  "find[codepoint]",
  "find[byte]",
  "find",
  "contains",
  "#",
  "size[codepoint]",
  "size[byte]",
  "include",
  "push",
  "..",
  "repeat",
  "split",
  "split_whitespace",
  "join",
  "right_align",
  "replace",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "int_to_dec",
  "int_to_bin",
  "int_to_hex",
  "int_to_bool",
  "dec_to_int",
  "bool_to_int",
];

const special_exprs = [
  "func",
  "array",
  "list",
  "set",
  "table",
  "conditional",
  "unsafe_conditional",
  "while",
  "for",
  "for_argv",
  "if",
  "any_int",
];

const words = (x: string) => x.split(" ");

const nullaryTypes = words("Void Bool Int 0..oo Text Ascii");
const sexprTypes = words("Text Ascii List Array Table Set Func");

function getVariableNames(context: CompletionContext, currentFrom: number) {
  const tree = syntaxTree(context.state);
  const result: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.name === "Variable" && currentFrom !== node.from)
        result.push(context.state.sliceDoc(node.from, node.to));
    },
  });
  return result;
}

interface SyntaxNode {
  parent: SyntaxNode | null;
  name: string;
}

function isTypeNode(node: SyntaxNode | null): boolean {
  return (
    node !== null && (node.name === "Type_sexpr" || isTypeNode(node.parent))
  );
}

function isTypeContext(context: CompletionContext) {
  return isTypeNode(syntaxTree(context.state).resolveInner(context.pos, -1));
}

function autocomplete(context: CompletionContext) {
  const typeOptions = nullaryTypes
    .map((label) => ({ label, type: "type", boost: 1 }))
    .concat(
      sexprTypes.map((label) => ({
        label: "(" + label,
        type: "type",
        boost: 0,
      })),
    );
  const keywordOptions = opcodes
    .concat(special_exprs)
    .map((label) => ({ label, type: "keyword" }));

  const varMatch = context.matchBefore(/\$\w*/);
  if (varMatch) {
    return {
      from: varMatch.from,
      options: getVariableNames(context, varMatch.from).map((label) => ({
        label,
        type: "variable",
      })),
    };
  }
  const annotationMatch = context.matchBefore(/: ?\(?\w*/);
  if (annotationMatch) {
    return {
      from: context.matchBefore(/\(?\w*/)!.from,
      options: typeOptions,
    };
  }
  let word = context.matchBefore(/\w*/)!;
  if (
    word !== null &&
    word.from == word.to &&
    context.matchBefore(/\(/)?.text !== "(" &&
    !isTypeContext(context) &&
    !context.explicit
  )
    return null;
  return {
    from: word.from,
    options: isTypeContext(context) ? typeOptions : keywordOptions,
  };
}

export const PolygolfLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Variants: delimitedIndent({ closing: "}", align: false }),
      }),
      foldNodeProp.add({
        Variants: foldInside,
      }),
      styleTags({
        Variable: t.variableName,
        String: t.string,
        Builtin: t.keyword,
        Nullary: t.constant(t.keyword),
        Opalias: t.operator,
        Type_name: t.typeName,
        Integer: t.integer,
        LineComment: t.lineComment,
        "( )": t.paren,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "%" },
    autocomplete,
  },
});
export function polygolf() {
  return new LanguageSupport(PolygolfLanguage);
}
