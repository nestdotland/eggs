import { semver, Module as YolkModule, Upload as YolkUpload } from "../deps.ts";

export class Module {
  name?: string;
  owner?: string;
  description?: string;
  latestVersion?: string | null;
  latestStableVersion?: string | null;
  uploads?: YolkUpload[];

  constructor(module: YolkModule) {
    this.name = module.name;
    this.owner = module.owner;
    this.description = module.description;
    this.latestVersion = module.latestVersion;
    this.latestStableVersion = module.latestStableVersion;
    this.uploads = module.uploads;
  }

  getLatestVersion(): string {
    function vn(n: string): string {
      return n.split("@")[1];
    }

    let latest: string | undefined;
    if (!this.uploads) return "0.0.0";
    if (this.uploads.length > 0) {
      function cmp(a: YolkUpload, b: YolkUpload): number {
        if (!a.name?.split("@")[1] || !b.name?.split("@")[1]) return 0;
        return -(semver.compare(
          a.name.split("@")[1],
          b.name.split("@")[1],
        ));
      }

      const sorted = this.uploads.sort(cmp);
      if (sorted[0].name) latest = vn(sorted[0].name);
    }

    if (!latest && this.latestVersion) {
      latest = vn(this.latestVersion);
    } else if (!latest && this.latestStableVersion) {
      latest = vn(this.latestStableVersion);
    }

    return latest ?? "0.0.0";
  }
}
