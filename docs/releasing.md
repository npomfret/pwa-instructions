# Releasing pwa-instructions

Publish one public package from your personal npm account. No organisation is required. The main entry point contains detection and guide data; `/react` adds the optional React components.

1. Run `npm login` and complete the browser sign-in. `npm whoami` confirms the account.
2. Update the version in `packages/pwa-instructions/package.json` and the example's dependency, then refresh `package-lock.json` with `npm install`.
3. Ensure the preceding CI run and any local test run have finished. Run `npm run check`; tests use one worker and include checking the packed entry points.
4. Commit and push the release source. Run `npm run pack:package` to build the npm archive. Inspect its contents with `tar -tzf pwa-instructions-<version>.tgz`.
5. Publish the checked archive with `npm publish ./pwa-instructions-<version>.tgz --access public`. Complete npm's authentication challenge yourself when prompted.
6. Confirm the registry version with `npm view pwa-instructions version`. Check that a fresh consumer can install the version and import both `pwa-instructions` and `pwa-instructions/react` when React is present.

Published versions cannot be replaced with different contents. Make a new version for later changes. Package files are explicitly limited to compiled JavaScript, declarations, guide assets, the README and the licence; reference screenshots and build caches are excluded.

See npm's [publishing guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/) and [authentication requirements](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
