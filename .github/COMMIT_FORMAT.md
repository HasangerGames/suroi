# Commit Message Format
Commit messages should follow a format that includes a `type`, `scope`, `file`, and `subject`.

```fix
<type> (<scope>): (<file>) <subject>
```
Note: `scope` and `file are optional.

Example - `fix (server): prevented downed players from interacting with objects`

Any line of the commit message cannot be longer than 100  characters. This makes the message easier to read on GitHub as well as in various git tools.

## Type
Must be one of the following:

* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation.
* **deploy**: An automated commit, normally from a workflow.
* **docs**: Only documentation changes.
* **enhance**: Improvements to an existing feature.
* **feat**: A new feature, or a significant change to an existing feature.
* **fix**: A bug fix.
* **perf**: A code change that improves performance.
* **refactor**: A code change that neither fixes a bug nor adds a feature.
* **style**: Changes that do not affect the meaning of the code (whitespace, formatting, missing semicolons, etc.)

## Scope
The scope is optional and can be anything specifying the location of the commit change.

## File
The file is optional and could specify a change in a specific file. This should be the file's path from the root of the repository; for example, `src/index.ts`.

## Subject
The subject contains succinct description of the change:

* Use the past tense: `changed` not `change` nor `changes`.
* Do not use a period (.) at the end.
* Do not use markdown formatting.
