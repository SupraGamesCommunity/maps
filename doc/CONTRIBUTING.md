# Contributing

This document describes how you can contribute to this application: both data improvements (adding useful information
to the maps) and how to submit features and bug-fixes.

## Development workflow overview

This section gives an overview of the change process. Later sections explain each of these steps in detail.

1. One-time setup to configure your GitHub account.
2. One-time setup to clone this repository to your local system, and set up your development environment.
3. Create a local feature-branch.
4. Make code / data changes to the local files, and test changes.
5. Commit the changes to your feature branch.
6. When ready for review, push your feature-branch to your GitHub repository, and create a Pull Request (PR).
7. The PR will be reviewed by others in the team. If the review suggests any tweaks, make them locally and push
   again to update the PR with the changes.
8. When approved, the code can be landed on the `main` branch, effectively becoming part of the codebase.
9. Clean up your local feature-branch.


### 1. GitHub setup guide

This is a one-time task to set up your personal copy of this repository.

1. Login to GitHub. (You must have a [GitHub](https://github.com) account. These are free to sign up.)
2. Navigate to this repository: https://github.com/SupraGamesCommunity/maps/
3. Create a personal fork (copy) of this repo in your own account: Near the top right, click the "Fork" button and
   follow the steps.
4. **Recommended**: Install the [`gh` CLI tool](https://cli.github.com/) or
   [GitHub Desktop](https://github.com/apps/desktop).


### 2. Clone the repo and set up your dev environment

This is a one-time task. This assumes you have installed Git, and the GitHub CLI tool (`gh`).

1. Navigate to your fork of this repo on GitHub. (Go to [GitHub](https://github.com), click your profile picture
   at the top right, and select "Repositories". Find the "maps" repository and click the name.)
2. There is a green "Code" button near the top. Click it, select the "Local" tab, then the "GitHub CLI" tab. This
   will suggest a CLI command to run that you can use to clone this repo, e.g. `gh repo clone my_github_username/maps`
3. In your local system, create a directory that will be used to store your local development copy. Open
   a terminal window, and change directory into this directory.
4. Run the `gh repo clone ...` command that GitHub suggested in step 2. Follow the prompts and the repository will
   be cloned into a new directory called `maps/`.
5. Change directory into `maps/` and run `git remote -v`. You should see something similar to the following:

```
/Users/myname/development/maps: $ git remote -v
origin  https://github.com/my_github_username/maps.git (fetch)
origin  https://github.com/my_github_username/maps.git (push)
upstream        https://github.com/SupraGamesCommunity/maps.git (fetch)
upstream        https://github.com/SupraGamesCommunity/maps.git (push)
```

This shows that `origin` and `upstream` are defined as remote repositories for this repo. You are expected to
**pull updates** from the official `SupraGamesCommunity/maps` repo (`upstream`), and **push branches** to
your personal fork repo (`origin`). This will be described in later sections.

6. Now that you have a copy of the code locally, you need to install tools to perform tasks. Refer to
   [`BACKEND_DEVELOPMENT`](./BACKEND_DEVELOPMENT.md), [`FRONTEND_DEVELOPMENT`](./FRONTEND_DEVELOPMENT.md), or
   [`EDITING_DATA`](./EDITING_DATA.md) for specific setup instructions related to those tasks.


### 3. Create a local feature-branch.

Your changes will be isolated on a feature branch. Create a feature branch in git:

1. In the terminal, navigate to the directory that contains the repository clone. E.g.

```sh
cd /Users/myname/development/maps
```

2. Make sure your repository is up-to-date. To ensure that your local copy has all the latest changes that others
   have made, run the following commands:

```sh
git checkout main           # This switches to the default `main` branch.
git pull upstream main      # Download all the changes from the official `upstream` repo, and merge them into `main`.
```

3. Choose a name for your feature branch. This is typically a brief description of the change, e.g. `bugfix_importer`
   or `feature_shiny_buttons`. It's mainly to help you remember what is on this branch, when you may have many others.

4. Create the branch: `git checkout -b your_feature_branch_name`


### 4. Make code / data changes to the local files, and test changes.

At this point, you can make changes to the source code and data files. You can test that the changes work
as expected by running a local development server to view the map locally.

Follow the guidance in [`BACKEND_DEVELOPMENT`](./BACKEND_DEVELOPMENT.md),
[`FRONTEND_DEVELOPMENT`](./FRONTEND_DEVELOPMENT.md), and
[`EDITING_DATA`](./EDITING_DATA.md) for specific instructions.


### 5. Commit the changes to your feature branch.

When your changes are ready, commit the changes to your feature branch.

If there are any new files, add them using `git add path/to/the/file`.

Commit the changes with `git commit -am "A brief description of the change"`.


### 6. Make a Pull Request

When you feel that your change is ready for review, push your feature-branch to your GitHub repository and create
a Pull Request (PR):

1. Ensure all the changes are committed. Run `git status` to check if there are any modified files that you may
   have forgotten to add.
2. Run `git push origin`. This will push your **feature branch** to your forked repository on GitHub. Typically
   you will see a message that includes a URL that you should copy/paste into a browser:

```
remote:
remote: Create a pull request for 'my_feature_branch' on GitHub by visiting:
remote:      https://github.com/your_github_username/maps/pull/new/my_feature_branch
remote:
```

(Alternatively, you can also create a PR by navigating to your `maps/` repository on GitHub,
where you will see a yellow banner with a message like: "**`my_feature_branch`** had recent pushes 2 minutes
ago: Compare & pull request". Click the green button to show the "Create PR" form.)

3. Complete this "Comparing changes" form:

* The **Title** should be a succinct one-line description of the change.
* The **Description** should be sufficient details about the change. This will be used by reviewers to understand
  what you are trying to achieve, so include information like:

* Context: Describe the problem you're solving, perhaps with a link to an existing Issue that discusses the problem
  and solutions.
* Summary: A high-level overview of the changes (especially if there are many files / lines changed).
* Notes: Anything that the reviewer should be aware of when reviewing your changes.

4. Click the green "Create pull request" button. This will submit your change for review.


### 7. Wait for review

The PR will be reviewed by others in the team. The reviewer may make comments on specific parts of your change.

If the review finds any problems, or suggests some code tweaks, then you can address these by:

1. Making the changes locally, and re-testing your code.
2. Committing the updates.
3. Use `git push origin` again to push the updates to the PR. The reviewer will be notified that you've pushed
   new changes.

**Important**: Please do not "force push" changes to a PR that has already been reviewed. A force push will replace
the branches entire history, so the reviewer will have to re-review your changes from scratch. Without force pushes,
the reviewer can use GitHub's "View changes since last push" feature to only check your additional updates.

4. When the reviewer is satisfied with your change, it will be marked as approved.


### 8. Land the change

Once approved, you or a repository administrator may merge the PR into `main` by clicking the green "Merge" button
at the bottom of the PR's conversation tab.

This will automatically trigger a rebuild and deployment of the application. (It may take a few minutes for the changes
to become available at https://supragamescommunity.github.io/maps/ )


### 9. Clean up your local feature-branch.

Now that your change is landed, you no longer need your feature-branch. Clean it up locally with:

```sh
git checkout main                  # Switch back to the main branch
git pull upstream main             # Retrieve and merge any updates from the official repository
git branch -d my_feature_branch    # Delete the feature branch locally.
```


## Coding guidelines

When making changes to code, please follow established style conventions:

* Case conventions:
  * Variables and function/method names: `camelCase`.
  * Classes: `CapitalLetter`. (Note: Acronyms like `HTML` should be lower-cased, e.g. `ConvertHtmlToDoc`.
  * Constants: `ALL_CAPS_WITH_UNDERSCORE`
* Maximum line width is 120 chars. (Keeping lines shorter than this allows developers to more easily open
  multiple files side-by-side).
* Use the auto-formatting tools to automatically apply formatting rules to source files.
  * To format Python files: `uvx black scripts/*.py`
  * To sort Python imports: `uvx isort scripts/*.py`
  * To format JavaScript and HTML files: `npm run prettier`
