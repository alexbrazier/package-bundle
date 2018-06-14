import rp from 'request-promise';
import Promise from 'bluebird';
import semver from 'semver';
import fs from 'fs';
import Step from './Step';
import PBError from './PBError';
import PBRequest from './PBRequest';

const writeFile = Promise.promisify(fs.writeFile);

const REGISTRY_URL = 'https://registry.npmjs.org';
const CACHE_FILE = 'package-bundle-cache.json';
const PACKAGE_JSON = 'package.json';

export default class Resolver extends Step {
  static getMatchingVersion(pkg, versions, range) {
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

  static logPackage(pkg) {
    Step.clearLine();
    process.stdout.write(pkg);
  }

  constructor(args) {
    super(args, 1, 'Resolving dependencies');
    this.args = args;
    this.packageCache = {};
    this.downloads = new Map();

    this.packages = args.args;

    if (!this.packages.length) {
      this.checkPackageJson();
    }

    if (args.cache) {
      try {
        const cacheFile = fs.readFileSync(CACHE_FILE);
        this.packageCache = JSON.parse(cacheFile);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }
  }

  init() {
    super.init();
    return Promise.mapSeries(this.packages, pkg => this.processInput(pkg))
      .then(() => this.args.cache && this.saveCache())
      .then(() => this.getResult());
  }

  checkPackageJson() {
    try {
      const packageFile = fs.readFileSync(PACKAGE_JSON);
      const { dependencies, devDependencies, optionalDependencies } = JSON.parse(packageFile);

      const combinedDependencies = Object.assign(
        {},
        dependencies,
        this.args.dev && devDependencies,
        this.args.optional && optionalDependencies
      );

      this.packages = Object.entries(combinedDependencies).map(([k, v]) => `${k}@${v}`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.args.help();
      } else {
        throw err;
      }
    }
  }

  getResult() {
    this.complete(`Found ${this.downloads.size} package${this.downloads.size === 1 ? '' : 's'}`);
    if (this.downloads.size === 0) {
      throw new PBError(`No new packages required.${this.args.cache ? ' Try running with the `--no-cache` option.' : ''}`, 'info');
    }
  }

  processInput(pkg) {
    let strippedAt = false;
    let name = pkg;
    let range;
    if (name.startsWith('@')) {
      name = name.substring(1);
      strippedAt = true;
    }
    if (name.includes('@')) {
      [name, range] = name.split('@');
    }
    if (strippedAt) {
      name = `@${name}`;
    }
    return this.resolveDependencies(name, range, { requested: true });
  }

  alreadyHaveValidVersion(pkg, range) {
    const versions = this.packageCache[pkg];
    return (!!versions && semver.maxSatisfying(versions, range) !== null);
  }

  resolveDependencies(pkg, range, { requested } = {}) {
    const regUrl = this.args.registry || REGISTRY_URL;
    const reqOptions = PBRequest(this.args);
    reqOptions.json = true;
    if (this.alreadyHaveValidVersion(pkg, range)) {
      return false;
    }
    return rp(`${regUrl}/${pkg.replace('/', '%2f')}`, reqOptions)
      .then((res) => {
        if (!res.versions) {
          throw new PBError(`Unable to find "${pkg}" version - ignoring.`, 'error');
        }
        const versions = Object.keys(res.versions);
        if ((this.args.allVersions && requested) || this.args.allVersionsRecursive) {
          return Promise.mapSeries(versions, v => this.getPackageVersion(res.versions[v]));
        }
        const version = range ? Resolver.getMatchingVersion(pkg, versions, range) : res['dist-tags'].latest;

        const packageObject = res.versions[version];
        return this.getPackageVersion(packageObject);
      })
      .catch(PBError, err => console.log(`${err.prettyMessage}\n`))
      .catch((err) => {
        if (err && err.statusCode === 404) {
          if (requested || !(this.args.allVersions || this.args.allVersionsRecursive)) {
            throw new PBError(`Unable to find package "${pkg}"`, 'error');
          }
        } else {
          console.log(err);
        }
      });
  }

  isCached(name, version) {
    if (this.packageCache[name] && this.packageCache[name].includes(version)) {
      return true;
    }
    this.packageCache[name] = (this.packageCache[name] || []).concat(version);
    return false;
  }

  getPackageVersion(pkg) {
    const {
      name, version, dist, dependencies, devDependencies, optionalDependencies
    } = pkg;

    if (this.isCached(name, version)) {
      return false;
    }
    const key = `${name}:${version}`;
    this.downloads.set(key, { name, version, dist });
    Resolver.logPackage(key);

    const combinedDependencies = Object.assign(
      {},
      dependencies,
      this.args.devRecursive && devDependencies,
      this.args.optionalRecursive && optionalDependencies
    );

    const keys = Object.keys(combinedDependencies);
    return Promise.map(keys, (k) => {
      const versionPattern = combinedDependencies[k];
      return this.resolveDependencies(k, versionPattern);
    }, { concurrency: this.args.concurrency || 100 });
  }

  saveCache() {
    return writeFile(CACHE_FILE, JSON.stringify(this.packageCache, null, 4));
  }
}
