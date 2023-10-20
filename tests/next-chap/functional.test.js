const {describe, test, expect} = require("@jest/globals");
const {
    extractChapLinks
} = require("../../v3/data/inject/next-chap/NextChap");
const {parseHTMLFromString, jsdomFetchAndParseHTML} = require("./utils");

require("../../v3/data/inject/next-chap/fastest-levenshtein/mod")

test('selector test', () => {
    const htmlExample = `
        <body>
        <span>loremipsum</span>

        <a class="btn btn-primary col-xs-12" href="/fiction/2982/bla-bla/chapter/403352/15-ipsum-man">
                            <i class="far fa-chevron-double-left mr-3"></i> Previous <br class="visible-xs-block">Chapter
                        </a>                        
        <a class="btn btn-primary col-xs-12" href="/fiction/2982/bla-bla/chapter/404665/17-lorem">
        Next <br class="visible-xs-block">Chapter <i class="far fa-chevron-double-right ml-3"></i>
            </a>

        </body>
    `;

    const doc = parseHTMLFromString(htmlExample)

    const links = doc.querySelectorAll('a[href]:not([href="javascript:void(0)"])')
    expect(links.length).toBeGreaterThan(1)

})

test('fetch test', async () => {

    const doc = await jsdomFetchAndParseHTML("https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war")
    const link = doc.querySelector('a[href="/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews"]');
    expect(link).toBeTruthy()

})


describe('Functional test of extractChapLinks', () => {
    test.concurrent.each([
        ["https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war",
            "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews",
            "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403352/15-cult-management"],
        ["https://www.mangaupdates.com/releases.html?page=2&", "https://www.mangaupdates.com/releases.html?page=3&", "https://www.mangaupdates.com/releases.html?page=1&"],
        ["https://www.mangaupdates.com/releases.html", "https://www.mangaupdates.com/releases.html?page=2&", undefined],
        ["https://nopa15.wordpress.com/2023/08/27/tpls-55/", "https://nopa15.wordpress.com/2023/08/27/tpls-56/", "https://nopa15.wordpress.com/2023/08/27/tpls-54/"]

        // Have an issue fetching the HTML, some protection from crawling probably.
        // ["https://www.wuxiaworld.com/novel/walking-daddy/wd-chapter-3", "https://www.wuxiaworld.com/novel/walking-daddy/wd-chapter-4", "https://www.wuxiaworld.com/novel/walking-daddy/wd-chapter-2"],
    ])("%s", async (url, nextLink, prevLink) => {
        const doc = await jsdomFetchAndParseHTML(url)

        // window.Levenshtein = Levenshtein
        const navLinks = extractChapLinks(doc)

        expect(navLinks.nextLink).toStrictEqual(nextLink);
        expect(navLinks.prevLink).toStrictEqual(prevLink);

    })
})