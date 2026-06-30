# Deploying maddie-bench to maddiedreese.com/maddie-bench

The benchmark source should live in its own repo:

```text
https://github.com/maddiedreese/maddie-bench
```

The existing personal site lives here:

```text
https://github.com/maddiedreese/maddie
```

Because `maddiedreese.com` is deployed from the `maddie` repo through Netlify, the simplest deployment path is:

1. Build `maddie-bench` as a static site with base path `/maddie-bench/`.
2. Copy the built files into the `maddie` repo under `maddie-bench/`.
3. Commit and push the `maddie` repo.
4. Netlify deploys `maddiedreese.com/maddie-bench`.

## Build

From the `maddie-bench` repo root:

```bash
npm run setup
npm run sync:public-data
npm run build:site
```

`npm run build:site` sets:

```bash
BASE_PATH=/maddie-bench/
```

so asset and data URLs work correctly at `https://maddiedreese.com/maddie-bench/`.

## Copy to the Maddie Site Repo

Assuming both repos are side by side:

```bash
rm -rf ../maddie/maddie-bench
mkdir -p ../maddie/maddie-bench
cp -R app/dist/. ../maddie/maddie-bench/
```

Then:

```bash
cd ../maddie
git add maddie-bench
git commit -m "Add maddie-bench"
git push
```

## Same Repo or Separate Repo?

Use separate repos:

- `maddie-bench` remains the reproducible benchmark source with runners, prompts, configs, artifacts, and docs.
- `maddie` remains the deployed personal website.

The deployed `/maddie-bench/` folder in `maddie` should be treated as a built artifact copied from `maddie-bench/app/dist`.

This keeps the benchmark reproducible without forcing the main personal site repo to contain runner scripts, model artifacts, OpenRouter tooling, and benchmark-specific dependencies.
