import { semver } from "../deps.ts";

export interface IModule {
  name: string;
  owner: string;
  description: string;
  latestVersion?: string;
  latestStableVersion?: string;
  packageUploadNames: string[];
}

export class Module implements IModule {
  name: string;
  owner: string;
  description: string;
  latestVersion?: string;
  latestStableVersion?: string;
  packageUploadNames: string[];

  constructor(module: IModule) {
    this.name = module.name;
    this.owner = module.owner;
    this.description = module.description;
    this.latestVersion = module.latestVersion;
    this.latestStableVersion = module.latestStableVersion;
    this.packageUploadNames = module.packageUploadNames;
  }

  getLatestVersion(stable?: boolean): string {
    let latest =
      (stable ? this.latestStableVersion : this.latestVersion)?.split("@")[1] ??
        "0.0.0";

    this.packageUploadNames.forEach((el) => {
      if (semver.compare(el.split("@")[1], latest) === 1) {
        latest = el.split("@")[1];
      }
    });
    return latest;
  }
}
