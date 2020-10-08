import { assertEquals } from "../../test/deps.ts";
import { ConfigFormat, configFormat } from "./config.ts";

Deno.test({
  name: "internal | config | file matching",
  fn(): void {
    assertEquals(configFormat("eggs.yml"), ConfigFormat.YAML);
    assertEquals(configFormat("eggs.yaml"), ConfigFormat.YAML);
    assertEquals(configFormat("eggs.json"), ConfigFormat.JSON);
    assertEquals(configFormat("eggs.js"), ConfigFormat.JSON); // because of fallback
  },
});
