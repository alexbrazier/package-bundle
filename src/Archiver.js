import fs from 'fs';
import tar from 'tar';
import Step from './Step';

const OUT_DIR = '.package-bundle';
const OUT_FILE = `package-bundle-${Date.now()}.tgz`;

export default class Archiver extends Step {
  constructor(args) {
    super(args, 3, 'Creating archive');
    this.args = args;
  }

  init(totalSize) {
    super.init(totalSize);
    const outFile = this.args.outFile || OUT_FILE;
    fs.watchFile(outFile, { interval: 100 }, (cur, pre) => {
      const change = cur.size - pre.size;
      this.tick(change);
    });
    return tar.create({
      gzip: true,
      file: outFile,
      cwd: OUT_DIR
    }, ['.'])
      .then(() => fs.unwatchFile(outFile))
      .then(() => this.complete(`Created archive at "${outFile}"`));
  }
}
