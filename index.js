const parseArgs = require('minimist');
const rp = require('request-promise');
const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const semver = require('semver');
const targz = require('tar.gz');
const rimraf = require('rimraf');
const rm = Promise.promisify(rimraf);
const writeFile = Promise.promisify(fs.writeFile);

const args = parseArgs(process.argv.slice(2));

const packages = args._;

const SKIM_URL = 'https://skimdb.npmjs.com/registry';
const OUT_DIR = '.package-bundle'
const OUT_FILE = `package-bundle-${Date.now()}.tgz`;
const CACHE_FILE = 'package-bundle-cache.json';

let packageCache = {};

try {
  const cacheFile = fs.readFileSync(CACHE_FILE);
  packageCache = JSON.parse(cacheFile);
} catch (err) {
  if (err.code !== 'ENOENT') {
    throw err;
  }
}

Promise.map(packages, (package) => getWithDependencies(package))
  .then(() => saveCache())
  .then(() => createArchive())
  .then(() => cleanUp())
  .catch(err => console.log(err.message));

function getWithDependencies(package, range) {
  return rp(`${SKIM_URL}/${package}`, { json: true })
    .then(res => {
      const versions = Object.keys(res.versions);
      const version = range ? semver.maxSatisfying(versions, range) : res['dist-tags'].latest;

      if (packageCache[package] && packageCache[package].indexOf(version) !== -1) {
        return; // Already have this version
      }

      packageCache[package] = (packageCache[package] || []).concat(version);

      const packageObject = res.versions[version];

      const { name, dist, dependencies, devDependencies, optionalDependencies } = packageObject;

      const combinedDependencies = Object.assign({}, dependencies, args.dev && devDependencies, args.optional && optionalDependencies);

      return getPackage(name, version, dist.tarball)
        .then(() => {
          const keys = Object.keys(combinedDependencies);
          return Promise.map(keys, (key) => {
            const versionPattern = combinedDependencies[key];
            return getWithDependencies(key, versionPattern);
          });
        });
    })
    .catch(err => {
      if (err.statusCode === 404) {
        throw new Error(`Unable to find package ${package}`);
      }
    });
}

function getPackage(package, version, tarball) {
  return new Promise((resolve, reject) => {
    request(tarball)
      .on('response', res => {
        const folder = `${OUT_DIR}/${package}/-`;
        mkdirp.sync(folder);
        res.pipe(fs.createWriteStream(`${folder}/${package}-${version}.tgz`));
      })
      .on('end', res => resolve(res))
      .on('error', err => reject(err));
  });
}

function createArchive() {
  if (fs.existsSync(OUT_DIR)) {
    return targz({}, { fromBase: true }).compress(OUT_DIR, OUT_FILE);
  } else {
    console.log('Nothing was downloaded');
  }
}

function cleanUp() {
  return rm(OUT_DIR);
}

function saveCache() {
  return writeFile(CACHE_FILE, JSON.stringify(packageCache, null, 4))
}
