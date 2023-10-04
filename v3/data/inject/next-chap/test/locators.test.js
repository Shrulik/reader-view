const { expect, describe, test } = require('@jest/globals');

const { parse } = require('url');
const { JSDOM } = require("jsdom");
const { PageNumberSuffixLocator, KeywordLocator, extractPotentialLinks, PageNumberAnywhereLocator } = require('../NextChap.js');
// const { DOMParser, parseHTML } = require('linkedom');

global.Levenshtein = require('../fast-levenshtein/levenshtein.js')



async function fetchAndSetHTMLLinkedome(url) {
    try {

        const urlObject = new URL(url)
        // Convert URL object to Location-like object
        const location = parse(urlObject.href, true);
        location.origin = urlObject.origin

        const response = await fetch(url);
        const html = await response.text();

        console.log(`Create loc ${JSON.stringify(location)}`)

        const {
            window, document
        } = parseHTML(html, {
            location
        })

        document.location = window.location

        console.log(`loc : ${JSON.stringify(document.location)}`)
        // console.log(`documnet : ${document}`)
        // console.log(`windoww : ${window}`)

        console.log('HTML content fetched and set successfully.');
        return document
    } catch (error) {
        console.error('Error fetching or setting HTML:', error);
    }
}


async function fetchAndSetHTMLHappyDocUnfunctioning(url) {
    try {

        // const window = new Window({
        //     url,
        //     // width: 1024,
        //     // height: 768
        //  });

        // const doc = window.document

        const response = await fetch(url);
        const html = await response.text();

        document.documentElement.innerHTML = html;
        // document.documentElement.innerHTML = html;

        console.log(`loc : ${doc.location}`)
        console.log('HTML content fetched and set successfully.');
        return doc
    } catch (error) {
        console.error('Error fetching or setting HTML:', error);
    }
}


function parseHTMLFromString(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    return document;
}

async function jsdomFetchAndParseHTML(url) {
    try {
        const dom = await JSDOM.fromURL(url);
        return dom.window.document;
    } catch (error) {
        console.error('Error fetching or parsing HTML:', error);
    }
}

async function globalJsdomFetchAndParseHTML(url) {
    try {

        const urlObject = new URL(url)
        // Convert URL object to Location-like object
        const location = parse(urlObject.href, true);
        location.origin = urlObject.origin

        const response = await fetch(url);
        const html = await response.text();


        return document;
    } catch (error) {
        console.error('Error fetching or parsing HTML:', error);
    }
}

test.skip('selector test', () => {
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

});

// test.skip('locator test linkedome', async () => {

//     const url = "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war";
//     const doc = await fetchAndSetHTMLLinkedome(url)

//     const links = extractPotentialLinks(doc)

//     const anywhereLoc = new PageNumberAnywhereLocator();
//     const candidates = anywhereLoc.locate(url, links)

//     expect(candidates.areHighConfidenceCandidates()).toBeTruthy();
//     expect(candidates.next.length).toBe(1)
//     expect(candidates.next[0].link).toBe("/fiction/2982/bla-bla/chapter/404665/17-lorem")

//     expect(candidates.prev.length).toBe(1)
// });

describe('Single Locator - real sites', () => {
    // TODO, possibly no separation between single/two/zero links
    describe.only('Both exist', () => {


        describe.each([
            ["https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war",
                "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews",
                "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403352/15-cult-management"],

            ["https://www.mangaupdates.com/releases.html?page=2&",
                 "https://www.mangaupdates.com/releases.html?page=3&","https://www.mangaupdates.com/releases.html?page=1&"],        

            ["https://nopa15.wordpress.com/2023/08/27/tpls-55/",
                "https://nopa15.wordpress.com/2023/08/27/tpls-56/" ,"https://nopa15.wordpress.com/2023/08/27/tpls-54/" ]

                // TODO: Make separate case.
            // ["https://www.mangaupdates.com/releases.html", 
            // "https://www.mangaupdates.com/releases.html?page=1&", null],

        ])("%s", (url, nextLink, prevLink) => {
            test.concurrent.each([
                { locatorClass: PageNumberAnywhereLocator, correctAreBest: true, expectHighConfidence: true },
                { locatorClass: KeywordLocator, correctAreBest: false, correctWereFound : true,  expectHighConfidence: false },
                { locatorClass: PageNumberSuffixLocator, correctAreBest: false, expectHighConfidence: false },
            ])("$locatorClass.name ",
                async ({ locatorClass, expectHighConfidence, correctAreBest, linksFound }) => {

                    const doc = await jsdomFetchAndParseHTML(url)
                    const links = extractPotentialLinks(doc)

                    const locator = new locatorClass();
                    const candidates = locator.locate(new URL(url), links)

                    try{
                         if (expectHighConfidence)
                            expect(candidates.areHighConfidenceCandidates()).toBe(true);

                        if (correctAreBest) {
                            const best = candidates.bestCandidates()
                            expect(best.next.link.href).toBe(nextLink)
                            expect(best.prev.link.href).toBe(prevLink)
                        } else {
                            if (linksFound) {
                                const foundNextLinks = candidates.next.map( aElm => aElm.link.href)
                                foundNextLinks.includes(nextLink)
        
                                const foundPrevLinks = candidates.prev.map( aElm => aElm.link.href)
                                foundPrevLinks.includes(prevLink)                        
                            }                                            
                        }
                    }catch(error) {
                        error.message += '\n\nFailed candidates:\n' + candidates.toString()
                        throw error;
                    }
                                                            
                })
        })
    })
})
    ;


// test.skip('fetch test linkedome', async () => {

//     const doc = await fetchAndSetHTMLLinkedome("https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war")
//     const anchors = doc.querySelectorAll('a');

//     assert.equal(anchors.length > 1, true);
//     console.log(anchors[0].outerHTML)
//     const elm = doc.querySelector('a[href="/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews"]');    
//     assert.ok(elm)

// })

test('fetch test', async () => {

    const doc = await jsdomFetchAndParseHTML("https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war")
    const link = doc.querySelector('a[href="/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews"]');
    expect(link).toBeTruthy()

})