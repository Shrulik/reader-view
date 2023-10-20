const {JSDOM} = require("jsdom");

exports.jsdomFetchAndParseHTML =  async (url) => {
    try {
        const dom = await JSDOM.fromURL(url);
        return dom.window.document;
    } catch (error) {
        console.error('Error fetching or parsing HTML:', error);
    }
}

exports.parseHTMLFromString = (html, url) => {
    const dom = new JSDOM(html, {url});
    return dom.window.document;
}