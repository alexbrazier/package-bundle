const args = require('commander');
const rp = require('request-promise');
const request = require('request');
const fs = require('fs');
const Promise = require('bluebird');
const semver = require('semver');
const targz = require('tar.gz');
const rimraf = Promise.promisify(require('rimraf'));
const writeFile = Promise.promisify(fs.writeFile);
const mkdirp = Promise.promisify(require('mkdirp'));

args
  .version(require('../package').version)
  .usage('<packages...> [options] \n  where <packages> are in the format: ' +
    '[@scope/]<pkg>[@<tag | version | range>]')
  .alias('pb')
  .description('Create a bundle of packages including their dependencies in archive format')
  .option('-d, --dev', 'include dev dependencies')
  .option('-o, --optional', 'include optional dependencies')
  .option('-f, --flat', 'save in a flat file structure, instead of individual folders')
  .option('-z, --no-archive', 'leave dependencies in folder, and don\'t archive')
  .option('-x, --no-cache', 'don\'t use cache file to avoid repeat downloads')
  .option('-o, --out-file <file>', 'output file name')
  .option('-a, --all-versions', 'download all versions of specified packages')
  .option('-A, --all-versions-recursive', 'download all versions of specified packages and dependencies')
  .option('-c, --concurrency <n>', 'number of requests to make at the same time - default=50', parseInt)
  .parse(process.argv);

const packages = args.args;

if (!packages.length) {
  args.help();
}

const REGISTRY_URL = 'http://registry.npmjs.org';
const OUT_DIR = '.package-bundle';
const OUT_FILE = args.outFile || `package-bundle-${Date.now()}.tgz`;
const CACHE_FILE = 'package-bundle-cache.json';

if (fs.existsSync(OUT_DIR)) {
  throw new Error(`Output dir "${OUT_DIR}" already exists.`);
}

let packageCache = {};

if (args.cache) {
  try {
    const cacheFile = fs.readFileSync(CACHE_FILE);
    packageCache = JSON.parse(cacheFile);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

Promise.mapSeries(packages, (pkg) => init(pkg))
  .then(() => handleFinish())
  .then(() => args.cache && saveCache())
  .then(() => args.archive && createArchive())
  .catch(err => console.log(err.message))
  .then(() => args.archive && cleanUp())
  .catch(err => console.log(err.stack));

function init(pgk) {
  let strippedAt = false;
  let range;
  if (pgk.startsWith('@')) {
    pkg = pkg.substring(1);
    strippedAt = true;
  }
  if (pkg.includes('@')) {
    const parts = pkg.split('@');
    pkg = parts[0];
    range = parts[1];//TODO
  }
  if (strippedAt) {
    pkg = `@${pkg}`;
  }
  return getWithDependencies(pkg, range, { requested: true });
}

function getMatchingVersion(pkg, versions, range) {
  let maxVersion;
  try {
    maxVersion = semver.maxSatisfying(versions, range);
    if (!maxVersion) {
      throw new Error(`Unable to find version ${range} in ${pkg}`);
    }
  } catch (err) {
    if (!versions.includes(range)) {
      throw err;
    }
    maxVersion = range;
  }
  return maxVersion;
}

function getWithDependencies(pkg, range, { requested } = {}) {
  return rp(`${REGISTRY_URL}/${pkg.replace('/', '%2f')}`, { json: true })
    .then(res => {
      const versions = Object.keys(res.versions);
      if ((args.allVersions && requested) || args.allVersionsRecursive) {
        return Promise.mapSeries(versions, (version) => getPackageVersion(res.versions[version]));
      }
      const version = range ? getMatchingVersion(pkg, versions, range) : res['dist-tags'].latest;

      const packageObject = res.versions[version];
      return getPackageVersion(packageObject)
    })
    .catch(err => {
      if (err && err.statusCode === 404) {
        throw new Error(`Unable to find package ${pkg}`);
      } else {
        console.log(err);
      }
    });
}

function getPackageVersion(pkg) {
  const { name, version, dist, dependencies, devDependencies, optionalDependencies } = pkg;

  if (packageCache[name] && packageCache[name].includes(version)) {
    return; // Already have this version
  }
  packageCache[name] = (packageCache[name] || []).concat(version);

  const combinedDependencies = Object.assign({}, dependencies, args.dev && devDependencies, args.optional && optionalDependencies);
  return getPackage(name, version, dist.tarball)
    .then(() => {
      const keys = Object.keys(combinedDependencies);
      return Promise.map(keys, (key) => {
        const versionPattern = combinedDependencies[key];
        return getWithDependencies(key, versionPattern);
      }, { concurrency: args.concurrency || 50 });
    });
}

function getPackage(pkg, version, tarball) {
  const folder = args.flat ? OUT_DIR : `${OUT_DIR}/${pkg}/-`;
  const strippedName = pkg.includes('/')
    ? (args.flat ? pkg.replace('/', '-') : pkg.split('/')[1])
    : pkg;
  return mkdirp(folder)
    .then(() => {
      return new Promise((resolve, reject) => {
        request(tarball)
          .on('error', () => reject())
          .pipe(fs.createWriteStream(`${folder}/${strippedName}-${version}.tgz`))
          .on('finish', () => resolve())
      });
    });
}

function handleFinish() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(`No new packages were downloaded.${args.cache && ' Try running with the `--no-cache` option'}`);
  }
}

function createArchive() {
  return targz({}, { fromBase: true }).compress(OUT_DIR, OUT_FILE);
}

function cleanUp() {
  return rimraf(OUT_DIR);
}

function saveCache() {
  return writeFile(CACHE_FILE, JSON.stringify(packageCache, null, 4))
}
