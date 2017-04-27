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
  .version(require('./package').version)
  .usage('[options] <packages...>')
  .alias('pb')
  .description('Create a bundle of packages including their dependencies in archive format')
  .option('-d, --dev', 'Include dev dependencies')
  .option('-o, --optional', 'Include optional dependencies')
  .option('-f, --flat', 'Save in a flat file structure, instead of individual folders')
  .option('-a, --no-archive', 'Leave dependencies in folder, and don\'t archive')
  .option('-c, --no-cache', 'Don\'t use cache file to avoid repeat downloads')
  .option('-o, --out-file <file>', 'Output file name')
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

Promise.map(packages, (package) => getWithDependencies(package))
  .then(() => handleFinish())
  .then(() => args.cache && saveCache())
  .then(() => args.archive && createArchive())
  .catch(err => console.log(err.message))
  .then(() => args.archive && cleanUp())
  .catch(err => console.log(err.stack));

function getWithDependencies(package, range) {
  return rp(`${REGISTRY_URL}/${package.replace('/', '%2f')}`, { json: true })
    .then(res => {
      const versions = Object.keys(res.versions);
      let maxVersion;
      try {
        maxVersion = semver.maxSatisfying(versions, range);
      } catch (err) {
        if (versions.indexOf(range) === -1) {
          console.log(`Unable to find version ${range} in ${package}`);
        }
        maxVersion = range;
      }
      const version = range ? maxVersion : res['dist-tags'].latest;

      if (packageCache[package] && packageCache[package].indexOf(version) !== -1) {
        return; // Already have this version
      }

      packageCache[package] = (packageCache[package] || []).concat(version);

      const packageObject = res.versions[version];

      const { name, dist, dependencies, devDependencies, optionalDependencies } = packageObject;

      const combinedDependencies = Object.assign({}, dependencies, args.dev && devDependencies, args.optional && optionalDependencies);
      return getPackage(package, version, dist.tarball)
        .then(() => {
          const keys = Object.keys(combinedDependencies);
          return Promise.map(keys, (key) => {
            const versionPattern = combinedDependencies[key];
            return getWithDependencies(key, versionPattern);
          });
        });
    })
    .catch(err => {
      if (err && err.statusCode === 404) {
        throw new Error(`Unable to find package ${package}`);
      } else {
        console.log(err);
      }
    });
}

function getPackage(package, version, tarball) {
  const folder = args.flat ? OUT_DIR : `${OUT_DIR}/${package}/-`;
  const strippedName = package.includes('/')
    ? (args.flat ? package.replace('/', '-') : package.split('/')[1])
    : package;
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
