// Workaround for this jsdom issue: https://github.com/jsdom/jsdom/issues/2524
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

debugger;

console.log(`process.env.DEBUG=${process.env.DEBUG}`)

// So tests don't fail on timeout when debugging
const inspector = require('inspector');
if (inspector.url()) {
    jest.setTimeout(1000 * 60 * 1000);
}