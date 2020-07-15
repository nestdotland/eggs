// TODO(@qu4k): remove
// this is a dummy test, to make the CI happy

import { assertEquals } from "../test_deps.ts";
import { version } from "./version.ts";

Deno.test({
  name: "internal | version | number",
  fn(): void {
    assertEquals(version, "0.1.9");
  },
});
