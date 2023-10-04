const {
    UrlUtils,
} = require('../NextChap.js');

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
