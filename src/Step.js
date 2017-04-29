import ProgressBar from 'progress';
import readline from 'readline';
import 'colors';

export default class Step {
  static clearLine() {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  get stepInfo() {
    const steps = this.args.archive ? 3 : 2;
    return `${`[${this.step}/${steps}]`.dim} ${this.description}`;
  }

  constructor(args, step, description) {
    this.step = step;
    this.description = description;
  }

  init(total) {
    this.startTime = Date.now();
    if (total) {
      this.progressBar = new ProgressBar('[:bar] :percent :etas', {
        complete: '█',
        incomplete: '░',
        width: process.stdout.columns - 5,
        total,
        clear: true
      });
    }

    console.log(`${this.stepInfo}...`);
  }

  tick(amount) {
    this.progressBar.tick(amount);
  }

  complete(result) {
    if (this.progressBar) {
      this.progressBar.update(1);
    }

    const seconds = (Date.now() - this.startTime) / 1000;

    Step.clearLine();
    readline.moveCursor(process.stdout, 0, -1);
    Step.clearLine();

    console.log(`${this.stepInfo}: ${'success'.green}: ${result} (${seconds}s)`);
  }
}
