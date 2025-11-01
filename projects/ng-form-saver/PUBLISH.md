# Publishing ng-form-saver to npm

This guide walks through publishing the library package to npm from this monorepo.

Prerequisites

- You have an npm account and are logged in (`npm login`).
- If the package name is scoped (@your-org/name) and you want public access, use `npm publish --access public` or set `publishConfig.access` to `public` (already set in `package.json`).

Steps

1. Update package metadata

   - Open `projects/ng-form-saver/package.json` and set:
     - `name` (e.g. `@your-scope/ng-form-saver` if scoped)
     - `version` to the new release semver
     - `author`, `repository.url`, `homepage`, and `bugs.url` as needed

2. Build the library

```bash
ng build ng-form-saver --configuration production
```

This produces `dist/ng-form-saver`.

3. Inspect the `dist/ng-form-saver` package

```bash
ls -la dist/ng-form-saver
cat dist/ng-form-saver/package.json
```

Ensure files and fields look correct. `ng-packagr` copies `projects/ng-form-saver/package.json` into the dist package and augments it.

4. Publish

From the workspace root (or inside `dist/ng-form-saver`):

```bash
cd dist/ng-form-saver
npm publish --access public
```

If publishing a private scoped package, omit `--access public`.

5. Tag and push

Optionally tag git and push:

```bash
git tag vX.Y.Z
git push --tags
```

Notes and tips

- Make sure the package name you choose is available on npm.
- If you use 2FA with npm, you will be prompted for your OTP during publish.
- To publish from CI, ensure `npm` is authenticated (use npm tokens) and you build the project first.
- If you want the package to be auto-built on `npm pack` / `npm publish` when publishing from the project directory, you can add a `prepare` script in the project `package.json` that runs the build command. In monorepos it's more common to build at root then publish from `dist`.

Example `prepare` script (optional):

```json
"scripts": {
  "prepare": "cd ../../ && ng build ng-form-saver --configuration production"
}
```

This file is meant as a checklist for publishing. Update metadata before publishing.
