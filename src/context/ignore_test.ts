import { assertEquals } from "../../test/deps.ts";
import { parseIgnore } from "./ignore.ts";

Deno.test({
  name: "internal | ignore | parsing",
  fn(): void {
    const matched = parseIgnore(`
extends .gitignore
extends ./dir/*
.git/*
test/*
foo
   foo
   f o o
   f\\ o\\  o
./foo
foo/
foo/bar
!test/should_keep_this.ts
\\!test/should_ignore_this.ts
# this is a comment
    # this is a comment, just a bit indented
    `);
    if (Deno.build.os === "windows") {
      assertEquals(
        matched.denies,
        [
          /^\.git(?:\\|\/)+[^\\/]*(?:\\|\/)*$/,
          /^test(?:\\|\/)+[^\\/]*(?:\\|\/)*$/,
          /^(?:[^\\/]*(?:\\|\/|$)+)*foo(?:\\|\/)*$/,
          /^(?:[^\\/]*(?:\\|\/|$)+)*foo(?:\\|\/)*$/,
          /^(?:[^\\/]*(?:\\|\/|$)+)*foo(?:\\|\/)*$/,
          /^(?:[^\\/]*(?:\\|\/|$)+)*f o o(?:\\|\/)*$/,
          /^\.(?:\\|\/)+foo(?:\\|\/)*$/,
          /^(?:[^\\/]*(?:\\|\/|$)+)*foo(?:\\|\/)+(?:[^\\/]*(?:\\|\/|$)+)*$/,
          /^foo(?:\\|\/)+bar(?:\\|\/)*$/,
          /^\!test(?:\\|\/)+should_ignore_this\.ts(?:\\|\/)*$/,
        ],
      );
      assertEquals(
        matched.accepts,
        [/^test(?:\\|\/)+should_keep_this\.ts(?:\\|\/)*$/],
      );
    } else {
      assertEquals(
        matched.denies,
        [
          /^\.git\/+[^/]*\/*$/,
          /^test\/+[^/]*\/*$/,
          /^(?:[^/]*(?:\/|$)+)*foo\/*$/,
          /^(?:[^/]*(?:\/|$)+)*foo\/*$/,
          /^(?:[^/]*(?:\/|$)+)*foo\/*$/,
          /^(?:[^/]*(?:\/|$)+)*f o o\/*$/,
          /^\.\/+foo\/*$/,
          /^(?:[^/]*(?:\/|$)+)*foo\/+(?:[^/]*(?:\/|$)+)*$/,
          /^foo\/+bar\/*$/,
          /^\!test\/+should_ignore_this\.ts\/*$/,
        ],
      );
      assertEquals(matched.accepts, [/^test\/+should_keep_this\.ts\/*$/]);
    }
    assertEquals(
      matched.extends,
      [".gitignore", "./dir/*"],
    );
  },
});
