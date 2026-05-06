/* global __dirname, require */

/*
 * This script deploys the locally-built production site to *your* GitHub Pages
 * site: https://YOUR_GITHUB_USERNAME.github.io/maps
 *
 * See doc/FRONTEND_DEVELOPMENT.md for full instructions.
 */

const ghpages = require('gh-pages');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// Extract GitHub username and repo name from origin URL
function parseGitHubUrl(url) {
  // Handle HTTPS format: https://github.com/username/repo.git
  let match = url.match(/https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (match) {
    return [match[1], match[2]];
  }

  // Handle SSH format: git@github.com:username/repo.git
  match = url.match(/git@github\.com:([^\/]+)\/([^\/\.]+)/);
  if (match) {
    return [match[1], match[2]];
  }

  throw new Error('Could not parse GitHub URL.');
}

function isDistDirOk(directory) {
  // Check if dist directory exists and is not empty
  if (!fs.existsSync(directory)) {
    return false;
  }
  const files = fs.readdirSync(directory);
  return files.length > 0;
}

const directory = path.join(__dirname, '../dist');
if (!isDistDirOk(directory)) {
  console.error(`❌ ERROR: The dist directory ( ${directory} ) is either empty or does not exist!`);
  console.error('   Please run the build command first (e.g., npm run build)');
  process.exit(1);
}

let username = null,
  repo = null;
try {
  // Guardrail: Check if origin points to the main repository. This script should not be used for deploying there,
  // only the GitHub Actions should deploy there.
  const originUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  const mainRepoUrl = 'https://github.com/SupraGamesCommunity/maps.git';

  if (originUrl === mainRepoUrl || originUrl === mainRepoUrl.replace('.git', '')) {
    console.error('❌ ERROR: This script cannot be run on the main repository!');
    console.error(`   Origin remote points to: ${originUrl}`);
    console.error('   Please run this script only on your personal fork.');
    process.exit(1);
  }

  // Extract username and repo to construct GitHub Pages URL
  [username, repo] = parseGitHubUrl(originUrl);
} catch (err) {
  console.error('❌ Failed to check git remote origin:', err.message);
  process.exit(1);
}

const ghPagesUrl = `https://${username}.github.io/${repo}`;

console.log(`Starting deployment to ${ghPagesUrl} from: ${directory}...`);

ghpages.publish(
  directory,
  {
    branch: 'gh-pages',
    message: 'Auto-generated commit: Deploying static site',
    dotfiles: false,
  },
  (err) => {
    if (err) {
      console.error('❌ Deployment failed:', err);
    } else {
      console.log(`✅ Deployment complete! Your site is live at: ${ghPagesUrl}`);
    }
  }
);
