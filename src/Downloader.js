import request from 'request';
import fs from 'fs';
import Promise from 'bluebird';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
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
        ([/* key */, { name, version, tarball }]) => this.getPackage(name, version, tarball),
        { concurrency: this.args.concurrency || 50 }
      )
      .then(() => this.complete('Downloaded packages'));
  }

  getPackage(pkg, version, tarball) {
    const outDir = this.args.archive ? OUT_DIR : OUT_DIR.substring(1);
    const folder = this.args.flat ? outDir : `${outDir}/${pkg}/-`;
    const stripped = pkg.includes('/') && (this.args.flat ? pkg.replace('/', '-') : pkg.split('/')[1]);
    const strippedName = stripped || pkg;
    return mkdir(folder)
      .then(() => new Promise((resolve, reject) => {
        request(tarball)
          .on('error', () => reject())
          .on('response', (res) => {
            const size = parseInt(res.headers['content-length'], 10);
            this.totalSize += size;
          })
          .pipe(fs.createWriteStream(`${folder}/${strippedName}-${version}.tgz`))
          .on('finish', () => {
            this.tick(1);
            resolve();
          });
      }));
  }
}
