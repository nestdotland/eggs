import { semver } from "../../deps.ts";

export interface IModule {
  name: string;
  owner: string;
  description: string;
  repository?: string;
  latestVersion?: string;
  latestStableVersion?: string;
  packageUploadNames: string[];
}

export class Module implements IModule {
  name: string;
  owner: string;
  description: string;
  repository?: string;
  latestVersion?: string;
  latestStableVersion?: string;
  packageUploadNames: string[];

  constructor(module: IModule) {
    this.name = module.name;
    this.owner = module.owner;
    this.description = module.description;
    this.repository = module.repository;
    this.latestVersion = module.latestVersion;
    this.latestStableVersion = module.latestStableVersion;
    this.packageUploadNames = module.packageUploadNames;
  }

  getLatestVersion(): string {
    function vn(n: string): string {
      return n.split("@")[1];
    }

    function cmp(a: string, b: string): number {
      return -(semver.compare(vn(a), vn(b)));
    }

    let latest: string | undefined;

    if (this.packageUploadNames.length > 0) {
      const sorted = this.packageUploadNames.sort(cmp);
      latest = vn(sorted[0]);
    }

    if (!latest && this.latestVersion) {
      latest = vn(this.latestVersion);
    } else if (!latest && this.latestStableVersion) {
      latest = vn(this.latestStableVersion);
    }

    return latest ?? "0.0.0";
  }
}
