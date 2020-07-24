import { assertEquals } from "../../test_deps.ts";
import { configFormat, ConfigFormat } from "./config.ts";

Deno.test({
  name: "internal | config | file matching",
  fn(): void {
    assertEquals(configFormat("eggs.yml"), ConfigFormat.YAML);
    assertEquals(configFormat("eggs.yaml"), ConfigFormat.YAML);
    assertEquals(configFormat("eggs.json"), ConfigFormat.JSON);
    assertEquals(configFormat("eggs.js"), ConfigFormat.JSON); // because of fallback
  },
});
