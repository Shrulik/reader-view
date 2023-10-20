const { expect, describe, test } = require('@jest/globals');

const {
    UrlUtils,
} = require('../../v3/data/inject/next-chap/NextChap.js');



describe('Test link filtering', () => {
    test("Test bogus link filtering", () => {
        const curURL = new URL("http://www.google.com");


        // Remove self reference
        let filtered = UrlUtils.removeBogusLinks([curURL], curURL)
        expect(filtered.length).toBe(0);

        // Filter self reference + /#
        filtered = UrlUtils.removeBogusLinks([{href: curURL.href + "#"}], curURL);
        expect(filtered.length).toBe(0)

        // Leave self reference + /#2
        filtered = UrlUtils.removeBogusLinks([{href: curURL.href + "#2"}], curURL);
        expect(filtered.length).toBe(1)


        // Remove non http protocol links
        filtered = UrlUtils.removeBogusLinks([{href: "javascript:void();"}], curURL)
        expect(filtered.length).toBe(0);

    })
})

describe('Find number in string anywhere', () => {
    describe('matches', () => {
        describe.each([
            ["5", [5]],
            ["chapter-2", [2]],
            ["book-name-301", [301]],
            ["c120", [120]],
            ["my-book?pg=12", [12]],
            ["bla002", [2]],
            ["d120", [120]],
            ["5-chap", [5]],
            ["chap-10-lala", [10]],
            ["my-book?pg=12&", [12]],
            ["somebook#2", [2]],
            ["book2chap5", [2,5]],
        ])("from %s extract %i", (url, expectedNumber) => {
            test("", () => {
                const found = UrlUtils.extractAnyCnumFromString(url)
                expect(found).toStrictEqual(expectedNumber);
            });
        })
    })

    describe('no number', () => {
        describe.each([
            ["book"],
        ])("from %s found nothing", (url) => {
            test("", () => {
                const found = UrlUtils.extractAnyCnumFromString(url)
                expect(found).toBeNull();
            });
        })
    })


})

describe('Find number in string suffix', () => {

    describe('matches', () => {
        describe.each([
            ["5", 5],
            ["chapter-2", 2],
            ["book-name-301", 301],
            ["c120", 120],
            ["my-book?pg=12", 12],
            ["book2chap5", 5], //Special treatment of chap

        ])("from %s extract %i", (url, expectedNumber) => {
            test("", () => {
                const found = UrlUtils.extractNumberSuffixFromString(url)
                expect(found).toBe(expectedNumber);
            });
        })
    })

    describe('misses', () => {
        describe.each([
            ["d120"],
            ["5-chap"],
            ["chap-10-lala"],
            ["my-book?pg=12&"],
            ["book2bla5"], //Special treatment of chap
        ])("from %s found nothing", (url) => {
            test("", () => {
                const found = UrlUtils.extractNumberSuffixFromString(url)
                expect(found).toBeNull();
            });
        })
    })

})
