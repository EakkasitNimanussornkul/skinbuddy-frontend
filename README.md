# skinbuddy-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

# SkinBuddy

A specialized LINE LIFF web application designed to provide reliable dermatological advice through an AI-powered assistant.

### Members

- Teeranate Thotharat 662115025 </br>
- Eakkasit Nimanussornkul 662115058 </br>

# Guideline

### Commit Message Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

#### **Formats**

##### Default

```
<type>(optional scope): <description>
<optional body>
<optional footer>
```

##### Merge Commit

```
Merge branch '<branch name>'
```

##### Revert Commit

```
Revert '<reverted commit name>'
```

##### Types

| Type       | Purpose                                       |
| ---------- | --------------------------------------------- |
| `feat`     | Introduces a new feature                      |
| `fix`      | Fixes a bug                                   |
| `docs`     | Updates documentation                         |
| `style`    | Code style changes (no logic changes)         |
| `refactor` | Code restructuring (no behavior change)       |
| `test`     | Adds or modifies tests                        |
| `chore`    | Maintenance tasks (e.g., CI/CD, dependencies) |

##### Scope

The scope provides additional contextual information.

```
feat(api): add api for fetching all user
```

More example of the scope:

- navbar
- login
- cart
- image
- readme

##### Breaking Changes Indicator

Breaking change **MUST** be indicated by an `!` before `:` in this commit name

```
feat(api)!: change api endpoint for adding new product to cart
```

Information about the change **MUST** also be include in commit message footer.

##### Description

`Description` contains a concise description of the change.

- Use imperative, present tense: "change" not "changed" or "changes"
- Don't capitalize the first letter
- No dot (`.`) at the end

##### body

`Body` isn't mandatory but you should include it to explain complex commit or commit that fix bug.

```
fix(api): handle null values in user response

Previously, if a user had missing data, the API would return `null` without default values, causing frontend crashes. Now, we ensure a default structure in the response.
```

##### Footer

The `footer` should contain information about **Breaking Changes**(BREAKING CHANGES: ) you can also place **Reference Issues** that the commit refers to.

```
feat(api)!: change api endpoint for adding new product to cart

BREAKING CHANGES: use cart/add/[productID] instead of the old product/add/[productID]
```

```
fix(config): hide api key in the .env

Closes #69
```
