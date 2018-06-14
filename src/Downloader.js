import request from 'request';
import fs from 'fs';
import Promise from 'bluebird';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import PBError from './PBError';
import PBRequest from './PBRequest';
import Step from './Step';

const rm = Promise.promisify(rimraf);
const mkdir = Promise.promisify(mkdirp);
const OUT_DIR = '.package-bundle';

export default class Downloader extends Step {
  static cleanUp() {
    return rm(OUT_DIR);
  }

  constructor(args) {
    super(args, 2, 'Downloading packages');
    this.args = args;
    this.totalSize = 0;
  }

  init(downloads) {
    super.init(downloads.size);
    this.downloads = downloads;

    return Promise.map(
      this.downloads.entries(),
      ([/* key */, { name, version, dist }]) => this.getPackage(name, version, dist),
      { concurrency: this.args.concurrency || 50 }
    )
      .then(() => this.complete('Downloaded packages'));
  }

  getPackage(pkg, version, { shasum, tarball }) {
    const outDir = this.args.archive ? OUT_DIR : OUT_DIR.substring(1);
    const folder = this.args.flat ? outDir : `${outDir}/${pkg}/-`;
    const stripped = pkg.includes('/') && (this.args.flat ? pkg.replace('/', '-') : pkg.split('/')[1]);
    const strippedName = stripped || pkg;
    const hash = crypto.createHash('sha1');
    const reqOptions = PBRequest(this.args, tarball);
    hash.setEncoding('hex');
    return mkdir(folder)
      .then(() => new Promise((resolve, reject) => {
        const hashPass = new PassThrough; // eslint-disable-line

        hashPass
          .pipe(hash)
          .on('finish', () => {
            const hashResult = hash.read();
            if (hashResult !== shasum) {
              reject(new PBError(`sha1 hashes do not match for ${pkg}@${version}\nDownloaded (${hashResult})} does not equal provided (${shasum})`));
            } else {
              this.tick(1);
              resolve();
            }
          });
        request(reqOptions)
          .on('error', () => reject())
          .on('response', (res) => {
            const size = parseInt(res.headers['content-length'], 10);
            this.totalSize += size;
          })
          .pipe(hashPass)
          .pipe(fs.createWriteStream(`${folder}/${strippedName}-${version}.tgz`));
      }));
  }
}
