/**
 * Generate request options based on args
 * @param {object} args Command line args
 * @param {string} [url] Url for request
 */
export default function PBRequest(args, url) {
  const reqOptions = {};
  const { proxy, basicAuth, authToken } = args;

  if (url) {
    reqOptions.url = url;
  }

  if (basicAuth || authToken) {
    reqOptions.headers = {
      Authorization: basicAuth ? `Basic ${basicAuth}` : `Bearer ${authToken}`
    };
  }

  if (proxy) {
    reqOptions.proxy = proxy;
  }

  return reqOptions;
}
