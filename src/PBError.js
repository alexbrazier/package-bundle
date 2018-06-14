import colors from 'colors';

export default class PBError extends Error {
  get prettyMessage() {
    return `${`${this.type}`[this.type]}: ${this.message}`;
  }

  constructor(message, type = 'error') {
    super(message);
    this.type = type;
    this.name = 'PBError';

    const theme = {
      info: 'cyan',
      warn: 'yellow',
      error: 'red'
    };

    if (!Object.keys(theme).includes(type)) {
      throw new Error(`Invalid PBError type ${type}`);
    }

    colors.setTheme(theme);
  }
}
