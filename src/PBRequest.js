module.exports = {
  genRequest(args, url = '') {
    const reqOptions = {};
    const proxy = args.proxy || null;
    let authHeader = '';

    if (url !== '') {
      reqOptions.url = url;
    }
    if (args.basicAuth) {
      authHeader = `Basic ${args.basicAuth}`;
    } else if (args.authToken) {
      authHeader = `Bearer ${args.authToken}`;
    }
    if (authHeader !== '') {
      reqOptions.headers = { Authorization: authHeader };
    }
    if (proxy) {
      reqOptions.proxy = proxy;
    }
    return reqOptions;
  }
};
