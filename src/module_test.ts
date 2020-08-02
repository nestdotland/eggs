import { assertEquals } from "../test_deps.ts";
import { Module } from "./module.ts";

Deno.test({
  name: "internal | module | versioning",
  fn(): void {
    const eggs = new Module({
      name: "eggs",
      owner: "nest-land",
      description: "The CLI used to publish and update packages in nest.land.",
      latestVersion: undefined,
      latestStableVersion: "eggs@0.1.8",
      uploads: [
        { name: "eggs@0.1.7" },
        { name: "eggs@0.1.8" },
        { name: "eggs@0.1.9-rc1" },
      ],
    });

    const maze_generator = new Module({
      name: "maze_generator",
      owner: "TheWizardBear",
      description: "A module for generating mazes",
      latestVersion: "maze_generator@0.1.0-alpha.0",
      latestStableVersion: undefined,
      uploads: [
        { name: "maze_generator@0.0.8" },
        { name: "maze_generator@0.1.0-alpha.0" },
      ],
    });

    assertEquals(eggs.getLatestVersion(), "0.1.9-rc1");
    assertEquals(maze_generator.getLatestVersion(), "0.1.0-alpha.0");
  },
});
