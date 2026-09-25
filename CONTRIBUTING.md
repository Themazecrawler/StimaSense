# Contributing

## Setup

```sh
npm ci
npm run lint && npm run typecheck && npm test
```

Copy `.env.example` to `.env` and fill in the values before running the app.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, where type is one of
`feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `chore`, `style`. CI checks the commits on every pull request.

## Releases

Releases are tagged `vMAJOR.MINOR.PATCH` (semantic versioning). Record user-visible changes in `CHANGELOG.md`.
