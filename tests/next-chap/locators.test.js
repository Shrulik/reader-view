const {expect, describe, test} = require('@jest/globals');
const {
    PageNumberSuffixLocator,
    KeywordLocator,
    extractPotentialLinks,
    PageNumberAnywhereLocator
} = require('../../v3/data/inject/next-chap/NextChap.js');
const {jsdomFetchAndParseHTML} = require("./utils");

global.Levenshtein = require("../../v3/data/inject/next-chap/fastest-levenshtein/mod")

/**
 *
 * Given a list of links, returns a list of anchor elements.
 * Useful to test API that expect HTMLAnchorElement.
 *
 * @param {string[]} links
 * @returns {HTMLAnchorElement[]}
 */
function createAnchorElements(links) {
    return links.map(link => {
        const aTag = document.createElement('a');
        aTag.setAttribute('href', link);
        return aTag
    })
}

describe('Interesting cases for navigation links', () => {
    const exampleOrigin = 'https://www.example.com'

    test("No number on the main page, and current page is the main page", () => {

        const nextLink = `${exampleOrigin}/fiction/2982/bla-bla/lala1`

        const testLinks =
            createAnchorElements(
                [`${nextLink}`, `${exampleOrigin}/fiction/2982/la`, `${exampleOrigin}/fiction/bla`])

        const curURL = `${exampleOrigin}/fiction/2982/bla-bla`
        const locator = new PageNumberAnywhereLocator();
        // const candidates = locator.locate(new URL(curURL), links)
        const candidates = locator.locate(new URL(curURL), testLinks)

        expect(candidates.areHighConfidenceCandidates()).toBe(false);

        const foundNextLinks = candidates.next.map(aElm => aElm.link.href)
        expect(foundNextLinks).toEqual(expect.arrayContaining([nextLink]));
        expect(candidates.prev.length).toEqual(0);
    })

    test("No number on the main page, and the previous page is the main page.", () => {

        const prevLink = `${exampleOrigin}/fiction/2982/bla-bla`
        const testLinks =
            createAnchorElements(
                [`${prevLink}`, `${exampleOrigin}/fiction/2982/la`, `${exampleOrigin}/fiction/bla`])

        const curUrl = `${exampleOrigin}/fiction/2982/bla-bla/something-1`
        const locator = new PageNumberAnywhereLocator();
        const candidates = locator.locate(new URL(curUrl), testLinks)

        expect(candidates.areHighConfidenceCandidates()).toBe(false);

        const foundNextLinks = candidates.prev.map(aElm => aElm.link.href)
        expect(foundNextLinks).toEqual(expect.arrayContaining([prevLink]));
        expect(candidates.prev.length).toEqual(1);
    })
})

describe('Single Locator - real sites', () => {
    describe('Both exist', () => {

        describe.each([
            ["https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403994/16-vainqueurs-private-war",
                "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/404665/17-job-interviews",
                "https://www.royalroad.com/fiction/26534/vainqueur-the-dragon/chapter/403352/15-cult-management"],

            ["https://www.mangaupdates.com/releases.html?page=2&",
                "https://www.mangaupdates.com/releases.html?page=3&", "https://www.mangaupdates.com/releases.html?page=1&"],

            ["https://nopa15.wordpress.com/2023/08/27/tpls-55/",
                "https://nopa15.wordpress.com/2023/08/27/tpls-56/", "https://nopa15.wordpress.com/2023/08/27/tpls-54/"]

        ])("%s", (url, nextLink, prevLink) => {
            test.concurrent.each([
                {locatorClass: PageNumberAnywhereLocator, correctAreBest: true, expectHighConfidence: false},
                {
                    locatorClass: KeywordLocator,
                    correctAreBest: false,
                    correctWereFound: true,
                    expectHighConfidence: false
                },
                {locatorClass: PageNumberSuffixLocator, correctAreBest: false, expectHighConfidence: false},
            ])("$locatorClass.name ",
                async ({locatorClass, expectHighConfidence, correctAreBest, linksFound}) => {

                    const doc = await jsdomFetchAndParseHTML(url)
                    const links = extractPotentialLinks(doc)

                    const locator = new locatorClass();
                    const candidates = locator.locate(new URL(url), links)

                    try {
                        if (expectHighConfidence)
                            expect(candidates.areHighConfidenceCandidates()).toBe(true);

                        if (correctAreBest) {
                            const best = candidates.bestCandidates(0, true).toLinks()
                            expect(best.nextLink).toBe(nextLink)
                            expect(best.prevLink).toBe(prevLink)
                        } else {
                            if (linksFound) {
                                const foundNextLinks = candidates.next.map(aElm => aElm.link.href)
                                foundNextLinks.includes(nextLink)

                                const foundPrevLinks = candidates.prev.map(aElm => aElm.link.href)
                                foundPrevLinks.includes(prevLink)
                            }
                        }
                    } catch (error) {
                        error.message += '\n\nFailed candidates:\n' + candidates.toString()
                        throw error;
                    }

                })
        })
    })
})