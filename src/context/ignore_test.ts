import { assertEquals } from "../../test_deps.ts";
import { parseIgnore } from "./ignore.ts";

Deno.test({
  name: "internal | ignore | parsing",
  fn(): void {
    let matched = parseIgnore(`
.git/*
test/*
!test/should_keep_this.ts
# this is a comment
    # this is a comment, just a bit indented
    `);
    if (Deno.build.os === "windows") {
      assertEquals(
        matched.denies,
        [
          /^\.git(?:\\|\/)+[^\\/]*(?:\\|\/)*$/,
          /^test(?:\\|\/)+[^\\/]*(?:\\|\/)*$/,
        ],
      );
      assertEquals(matched.accepts, [/^test(?:\\|\/)+should_keep_this\.ts(?:\\|\/)*$/]);
    } else {
      assertEquals(
        matched.denies,
        [/^\.git\/+[^/]*\/*$/, /^test\/+[^/]*\/*$/],
      );
      assertEquals(matched.accepts, [/^test\/+should_keep_this\.ts\/*$/]);
    }
  },
});
