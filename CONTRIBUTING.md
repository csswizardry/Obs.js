# Contributing to Obs.js

Thank you for helping improve Obs.js. Keep changes focused, preserve the
inline-first adaptive contract, and include behavioural coverage for observable
changes.

## Local checks

Install the locked development dependencies and run the complete suite:

```sh
npm ci
npm test
npm run package:check
```

Generated `obs.min.js` is ignored. Do not commit private planning material,
dependency directories, editor files, or operating-system metadata.

## Pull requests and releases

Individual development commits can use natural messages. The final squash
merge title tells the release automation what kind of public change landed:

- `fix: ...` for a compatible bug fix;
- `feat: ...` for a compatible feature;
- `feat!: ...` or a `BREAKING CHANGE` footer for an incompatible change.

Documentation, tests, CI, chores, and refactors do not trigger a release by
themselves. Maintainers review and merge a separate generated release pull
request when the accumulated changes are ready. Contributors should not edit
the package version, changelog, or release tags by hand.
