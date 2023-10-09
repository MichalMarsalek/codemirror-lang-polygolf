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

// https://github.com/jared-hughes/polygolf/blob/main/src/IR/opcodes.ts
const opcodes = [
  "add",
  "sub",
  "mul",
  "div",
  "pow",
  "mod",
  "bit_and",
  "bit_or",
  "bit_xor",
  "min",
  "max",
  "lt",
  "leq",
  "eq",
  "neq",
  "gt",
  "geq",
  "or",
  "and",
  "array_contains",
  "list_contains",
  "table_contains_key",
  "set_contains",
  "array_get",
  "list_get",
  "table_get",
  "list_push",
  "concat",
  "repeat",
  "text_contains",
  "text_byte_find",
  "text_codepoint_find",
  "text_split",
  "text_get_byte",
  "text_get_byte_slice",
  "text_get_codepoint",
  "text_get_codepoint_slice",
  "join",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",

  "abs",
  "bit_not",
  "neg",
  "not",
  "int_to_text",
  "int_to_bin",
  "int_to_hex",
  "text_to_int",
  "bool_to_int",
  "int_to_text_byte", // Returns a single byte text using the specified byte.
  "int_to_codepoint", // Returns a single codepoint text using the specified integer.
  "list_length",
  "text_byte_length", // Returns the text length in bytes.
  "text_codepoint_length", // Returns the text length in codepoints.
  "text_split_whitespace",
  "join",
  "text_byte_reversed", // Returns a text containing the reversed order of bytes.
  "text_codepoint_reversed", // Returns a text containing the reversed order of codepoints.
  "text_byte_to_int",
  "codepoint_to_int",
  "true",
  "false",
  "print",
  "println",
  "print_int",
  "println_int",
  "text_replace",
  "array_set",
  "list_set",
  "table_set",
  "sorted",
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

const opaliases = words(
  "<- + - * ^ & | ~ >> << == != <= < >= > => # .. mod rem div trunc_div"
);

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
      }))
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
