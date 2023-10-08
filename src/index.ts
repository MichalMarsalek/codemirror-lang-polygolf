import { parser } from "./syntax.grammar";
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  delimitedIndent,
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

const opaliases =
  "<- + - * ^ & | ~ >> << == != <= < >= > => # mod rem div trunc_div".split(
    " "
  );

function autocomplete(context: CompletionContext) {
  let word = context.matchBefore(/\w*/)!;
  if (word.from == word.to && !context.explicit) return null;
  return {
    from: word.from,
    options: opcodes.map((label) => ({ label, type: "keyword" })),
  };
}

export const PolygolfLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({ closing: ")", align: false }),
      }),
      foldNodeProp.add({
        Application: foldInside,
      }),
      styleTags({
        Identifier: t.variableName,
        Boolean: t.bool,
        String: t.string,
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
export function Polygolf() {
  return new LanguageSupport(PolygolfLanguage);
}
