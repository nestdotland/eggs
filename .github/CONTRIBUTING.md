<p align="center">
  <img alt="GitHub issues" src="https://img.shields.io/github/issues-raw/nestdotland/eggs?logo=github">
  <img alt="GitHub closed issues" src="https://img.shields.io/github/issues-closed-raw/nestdotland/eggs?logo=github">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/nestdotland/eggs">
</p>
<p align="center">
  <a href="https://deno.land"><img src="https://img.shields.io/badge/-deno-gray?logo=deno" alt="Runtime"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/-typescript-blue?logo=typescript" alt="language"></a>
</p>

# Contributing / Developing

Contributions are welcome. Fork this repository and issue a pull request with your changes.

Please add new tests for new functionality, adapt the existing ones if needed, and make sure that `deno test` succeeds.

### Prerequisites
You need to have [Git](https://git-scm.com/downloads) and [deno](https://deno.land) installed on your system.

### Setting up Dev
Just execute these commands:

```shell
git clone https://github.com/nestdotland/eggs.git
cd eggs/
```

This project uses drake to manage project scripts. Run it with Deno:
```sh
deno run -A Drakefile.ts
# A shell alias shortcut can be set to run the default drakefile:
alias drake="deno run -A Drakefile.ts"
```

### Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [link to tags on this repository](/tags).

### Tests

```sh
drake test
```

### Style guide

```sh
drake format
drake lint
```

Make sure to use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Pull request

**Please PR to the `dev` branch!**
Then follow the [pull request template](.github/PULL_REQUEST_TEMPLATE/pull_request.md).

### Deploying / Publishing

Submit a pull request after running `drake dev` to ensure it runs correctly.
The module is automatically published to nest.land when a new release is published on github.
