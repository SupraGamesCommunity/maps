// This script deploys the locally-built production site to *your* GitHub Pages
// site: https://YOUR_GITHUB_USERNAME.github.io/maps
//
// See doc/FRONTEND_DEVELOPMENT.md for full instructions.

import * as process from 'process';

import { execFileSync } from 'child_process';
import readlineSync from 'readline-sync';
import { parseArgs } from 'util';

//-------------------------------------------------------------------------------------------------
// Utilities

let logger_error = console.error;
let logger_debug = console.debug;
let logger_info = console.info;
let logger = console.log;

// message: String: message decribing what the command is doing
// cmdArgs: String[]: command and arguments in an array
// exitOnError: Boolean: if true and command fails exit process
// stdio: String: stdio mode for execFileSync. pipe returns output, inherit sends it to console
function doCommand(message, cmdArgs, { exitOnError = true, stdio = 'pipe' } = {}) {
  logger_info(`\nInfo: ${message}`);
  logger_info('> ' + cmdArgs.join(' '));
  try {
    return execFileSync(cmdArgs[0], cmdArgs.slice(1), { encoding: 'utf8', stdio: stdio });
  } catch (error) {
    logger_error('Error:', error.message);
    if (exitOnError) {
      process.exit(error.status);
    }
    return undefined;
  }
}

//-------------------------------------------------------------------------------------------------
// Git status checks
function doChecks(branch) {
  logger('\nRunning checks before deployment');

  doCommand('Ensure repository is up to date', ['git', 'fetch', 'origin']);

  logger_debug(`Debug: Current branch = '${branch}'`);

  const isDirty =
    doCommand('Checking for modified, staged or deleted files', ['git', 'status', '--porcelain', '-uno']).length > 0;
  if (isDirty) {
    logger_error('\nError: Modified, staged or deleted files: ensure changes are committed before deployment');
  } else {
    logger_debug('Debug: No modified, staged or deleted files');
  }

  const unpushedCommits = Number(
    doCommand('Checking for unpushed commits', ['git', 'rev-list', '@{u}..HEAD', '--count']).trim()
  );
  if (unpushedCommits != 0) {
    logger_error(`\nError: push ${unpushedCommits} commits to origin before deploying`);
  } else {
    logger_debug('Debug: No unpushed commits');
  }

  if (isDirty || unpushedCommits != 0) {
    process.exit(-1);
  }
}

//-------------------------------------------------------------------------------------------------
// User confirmation
function doUserConfirm(branch, userConfirm = true) {
  if (userConfirm) {
    const confirm = readlineSync.keyInYN(`\nAre you sure you want to deploy "${branch}" to GitHub Pages / github.io?`);
    if (!confirm) {
      logger_error('\nError: Exiting without deploying');
      process.exit(-1);
    }
  }
}

//-------------------------------------------------------------------------------------------------
// Deployment
function doDeploy(branch) {
  doCommand(`Deploying ${branch} to repository github pages`, ['gh', 'workflow', 'run', 'deploy.yml', '--ref', branch]);
}

//-------------------------------------------------------------------------------------------------
// Deployment workflow watch
function doWatch(branch) {
  const runId = doCommand('Retrieve github run id', [
    'gh',
    'run',
    'list',
    '--workflow',
    'deploy.yml',
    '--branch',
    branch,
    '--limit',
    '1',
    '--json',
    'databaseId',
    '--jq',
    '.[0].databaseId',
  ]).trim();

  doCommand('Monitor status of deployment', ['gh', 'run', 'watch', runId], { stdio: 'inherit' });
}

//-------------------------------------------------------------------------------------------------
// Parse command line
function displayHelp() {
  logger(
    '\nUsage: node deploy-gh-pages.mjs {command} [options]' +
      '\n' +
      '\nModes:' +
      '\n  check     run checks to confirm deploy available' +
      '\n  watch     monitor status of last deploy workflow' +
      '\n  deploy    deploy current branch to gh pages' +
      '\n' +
      '\nOptions:' +
      '\n  --debug   display debug and info messages' +
      '\n  --verbose display info messages' +
      '\n  --quiet   suppress logging' +
      '\n  --help    display command and options'
  );
}

try {
  var args = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      debug: { type: 'boolean', short: 'd', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      confirm: { type: 'boolean', default: true },
    },
    allowNegative: true,
    allowPositionals: true,
  });
} catch (error) {
  logger_error('\nError:', error.message);
  displayHelp();
  process.exit(-1);
}

if (args.values.help) {
  displayHelp();
  process.exit(0);
}
if (
  args.positionals.length != 1 ||
  (args.quiet | (0 + args.values.debug) | (0 + args.values.verbose) | 0) > 1 ||
  !['check', 'watch', 'deploy'].includes(args.positionals[0])
) {
  logger_error('\nError: Unexpected command line options');
  displayHelp();
  process.exit(-1);
}

const mode = args.positionals[0];

if (!args.values.debug) {
  logger_debug = function () {};
  if (!args.values.verbose) {
    logger_info = function () {};
    if (args.values.quiet) {
      logger = function () {};
    }
  }
}

//-------------------------------------------------------------------------------------------------
// Do the work

const branch = doCommand('Retrieving current branch', ['git', 'rev-parse', '--abbrev-ref', 'HEAD']).trim();

if (mode == 'check' || mode == 'deploy') {
  doChecks(branch);
}

if (mode == 'deploy') {
  doUserConfirm(branch, args.values.confirm);

  logger(`\nDeploying ${branch} to github pages`);

  doDeploy(branch);

  // Wait for a while so the status check will actually get the right job
  logger_info('\nWaiting 5 seconds for workflow run to start');
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

if (mode == 'deploy' || mode == 'watch') {
  doWatch(branch);
}

process.exit(0);
