import http from 'http';
import url from 'url';
import cf from 'aws-cloudfront-sign';

const {
  PORT,
  NEXT_HOST,
  PRIVATE_KEY,
  KEYPAIR_ID
} = process.env;

const SIGNING_TTL = 300000;

const server = http.createServer().listen(PORT);

server.on('request', function (request, response) {
  try {
    const expires = new Date().getTime() + SIGNING_TTL;
    const signedCookies = cf.getSignedCookies(`${NEXT_HOST}/*`, {
      keypairId: KEYPAIR_ID, 
      expireTime: expires, 
      privateKeyString: PRIVATE_KEY});

    const options = url.parse(`${NEXT_HOST}${request.url}`);
    options.headers = request.headers;
    options.method = request.method;
    for(const cookieId in signedCookies) {
      options.headers.cookie = `${cookieId}=${signedCookies[cookieId]}; ${request.headers.cookie}`;
    }

    delete options.headers.host;
    const clientRequest = http.request(options, serverResponse => {
      response.writeHeader(serverResponse.statusCode, serverResponse.headers);
      serverResponse.pipe(response);
    });
    request.pipe(clientRequest);
  } catch (err) {
    console.error(err);
    response.statusCode = 500;
    response.write(JSON.stringify(err));
    response.end();
  }
});
