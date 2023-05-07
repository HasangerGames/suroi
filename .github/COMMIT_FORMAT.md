# Commit Message Format
Commit messages should have a format that includes a `*type`, `scope`, `file`, and `subject`:

```fix
<type>(<scope>): (<file>) <subject>
```

`scope` and `file` are optional.

Example — `fix: Stopped players from `

Any line of the commit message cannot be longer than 100 characters. This makes the message easier to read on GitHub as well as in various git tools.

## Type
Must be one of the following:

* **feat**: A new feature.
* **fix**: A bug fix.
* **docs**: Documentation only changes.
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
* **refactor**: A code change that neither fixes a bug nor adds a feature.
* **perf**: A code change that improves performance.
* **test**: Adding missing tests.
* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation.
* **deploy**: An automated commit, normally from a workflow.

## Scope
The scope is optional and could be anything specifying place of the commit change.

## File
The file is optional and could specify a change in a specific file. This should be the file's path from the root of the repository; for example, `src/file.ts`.

## Subject
The subject contains succinct description of the change:

* Use the imperative, present tense: `change` not `changed` nor `changes`.
* Do not dot (.) at the end.
* Do not use markdown formatting.
