'use strict';

const NavType = {
  PREV: Symbol('prev'),
  NEXT: Symbol('next'),
  INVALID: Symbol('invalid')
};


class UrlUtils {
  //I assume anything over 4 digits is not a chapter number.
  static chapterNumberSuffix = /(?:chapter|chap|c|page|[_-]|\b)(\d{1,4}$)/;
  static boundary_or_non_number = /(?:\D|\b)?/;
  // static chapterNumberAnywhere = /\d{1,4}/;

  //TODO: Deprecated
  static chapterNumberAnywhere =
    new RegExp(UrlUtils.boundary_or_non_number.source + '(\\d{1,4})' + UrlUtils.boundary_or_non_number.source, 'g');


/**
* 
* Returns either null if no chapter candidate was found or the chapter number,
* or an array of numbers in case there were miltiple matches. If an array is returned, then
* this fuction couldn't tell. Multiple urls are needed. 
* 
* @param {string} pathname 
*/
  static findSuffixChapterNumberInPath(pathname) {
    const pathSegments = pathname.split("/")
    let chapterNumbers = []

    pathSegments.forEach(segment => {
      const number = this.extractNumberSuffixFromString(segment)

      if (number) {
        chapterNumbers.push(number)
      }
    })

    return chapterNumbers.length === 0 ? null : chapterNumbers
  }

  /**
   * //TODO: Write unit tests, this probably doesn't do what I think it does being a regex. 
   * I invented a new word. Cnum is a chapter number. Even Co-pilot got it. 
   * @param {*} str 
   * @returns 
   */
  static extractAnyCnumFromString(str) {

    const matches = [...str.matchAll(UrlUtils.chapterNumberAnywhere)]

    if (!matches || !matches.length)
      return null;

    return matches.map(match => parseInt(match[1]))
  }

  static extractNumberSuffixFromString(str) {

    // Doesn't have to be matchAll because the regex isn't global. I want the last number, can't be many of t
    const matches = str.match(UrlUtils.chapterNumberSuffix)

    return matches ? parseInt(matches[1]) : null

  }

  static toPathSegments(url) {
    return url ? UrlUtils.toFullPath(url).split("/").slice(1) : null
  }

  /** 
   * @param {URL} url 
   * @returns {string} - Returns both the pathname and the search of the URL.
   */
  static toFullPath(url) {
    return url && (url.pathname ?? '') + (url.search ?? '')
  }

  /**
   * @param {URL | HTMLAnchorElement} url
   * @returns string - Returns an absolute URL, which is just the href property (Not to be confused with the href attribute which
   * can be a realtive url), but better named. 
   */
  static toAbsoluteURL(url) {
    return url ? url.href : undefined
  }

  /**
   * 
   * @param { NodeListOf<HTMLAnchorElement> } links 
   * @param {Location} location
   * @returns {HTMLAnchorElement[]} - A list of unique links converted to relative form that are not parents of other links.
   */
  static processLinks(links, location) {
    const curOriginLinks = UrlUtils.filterOtherOrigins(links, location.origin);
    const realLinks = UrlUtils.removeBogusLinks(curOriginLinks, location);
    const uniqueLinks = UrlUtils.removeDuplicates(realLinks);
    return UrlUtils.removeParentNodes(uniqueLinks);
  }

  static filterOtherOrigins(links, origin) {
    return Array.from(links).filter(link => link.origin === origin);
  }
  /**
   * Removes from nodes any node that is a parent of another node in nodes. Assumes nodes is a list of unique elements.
   * @param {Element[]} nodes 
   * @returns {Element[]}
   */
  static removeParentNodes(nodes) {
    const filteredNodes = [];
    let i = 0;

    while (i < nodes.length) {
      const node = nodes[i];
      let isParent = false;
      let j = 0;

      while (j < nodes.length) {
        const otherNode = nodes[j];

        if (node !== otherNode && node.contains(otherNode)) {
          isParent = true;
          break;
        }

        j++;
      }

      if (!isParent) {
        filteredNodes.push(node);
      }

      i++;
    }

    return filteredNodes;
  }

  /**
   * Handles duplicate links so only a single candidate is left.
   * The HTML of duplicate links is retained as a comment on the first found instance of the link for keyword checks
   * or other possible uses.
   * @param linkNodes
   * @returns {any[]}
   */
  static removeDuplicates(linkNodes) {
    const hrefsToLinks = new Map();

    linkNodes.forEach((link) => {
      const href = link.getAttribute("href");
      if (!hrefsToLinks.has(href)) {
        hrefsToLinks.set(href, link);
      } else {
        hrefsToLinks.get(href).innerHTML += `<!--${link.outerHTML}-->`
      }
    });

    return [...hrefsToLinks.values()];
  }

  /**
   * This method removes all links that don't have anything useful or easily comprehensible in the href attribute
   * or refere to elements in the current page.
   * For example, just have 'href="#"', 'href="#top"' or 'href="javascript:void(0);"'
   * @param links - links to filter
   * @param {URL} curURL - the current page URL
   * @returns normal http/https links to a different page
   */
  static removeBogusLinks(links, curURL) {


    /**
     * An anchor link leads to a different page fragment on the same page, not another page by definition.
     *
     * Note: There is some chance that http://host.com/chap#5 is the way actual page loading is handled via JS
     * or server side rendering or something so if there is a link to http://host.com/chap#5 instead of just #5 I don't remove it.
     * For this I check the attribute and not the calculated href property.
     */
    function isAnchorLink(link) {
      return  link.getAttribute('href').startsWith("#") ||  link.href === curURL.href + "#"
    }

    /**
     * Validate a reall http/https link, and not something weird like a javascript:void(0); or mailto:
     * @param link
     * @returns {boolean}
     */
    function isHttpLink(link) {
      return !(link.href.includes(':') && !link.href.startsWith('http'))
    }

    return Array.from(links).filter(link => isHttpLink(link) && !isAnchorLink(link) && link.href !== curURL.href);
  }
}

class NavigationLocator {
  #weight;

  constructor(weight = 1) {
    if (new.target === NavigationLocator) {
      throw new TypeError('NavigationLocator is an abstract class not meant to be instantiated.');
    }
    this.#weight = weight;
  }

  get weight() {
    return this.#weight;
  }

  /**
   * 
   * @param {Location} _url - The url of the current page
   * @param {HTMLAnchorElement[]} _elements - An array of anchor elements from which the navigation candidate links will be found.
   * @returns {NavigationCandidates} - candidates for next and prev links
   */
  locate(_url, _elements) {
    throw new Error('locate method must be implemented');
  }
}

/**
 * This locator looks for links with rel=next/prev which is the way a webpage is supposed to mark the next/prev links.
 * We will start with trusting webpages that have a rel=next/prev attribute. If there is zero or one of each then this
 * locator results will be picked.
 */
class RelLocator extends NavigationLocator {
  constructor(weight = 10) {
    super(weight)
  }

  locate(url, elements) {

    let nextLinks = [];
    let prevLinks = [];
    for( const link of elements ) {

      if ( link.rel === 'next'){
        nextLinks.push(link)
      } else if ( link.rel === 'prev'){
        prevLinks.push(link)
      }
    }

    const atLeastOne = nextLinks.length === 1 || prevLinks.length === 1
    const atMostOneEach =  nextLinks.length <= 1 && prevLinks.length <= 1;

    return atLeastOne && atMostOneEach ?
        NavigationCandidates.nonAmbiguousCandidates(prevLinks?.[0], nextLinks?.[0], this.weight) :
        NavigationCandidates.similarityBased(url, prevLinks, nextLinks, this.weight);
  }
}

class KeywordLocator extends NavigationLocator {

  constructor(weight = 2, navTypeToKeyword = {
    [NavType.NEXT]: ['next'],
    [NavType.PREV]: ['prev']
  }) {
    super(weight)
    this.navTypeToKeyword = navTypeToKeyword;
  }

  locate(url, elements) {

    let navTypeToLinkCandidates = new Map();


    Object.getOwnPropertySymbols(this.navTypeToKeyword).forEach(navType => {

      const keywords = this.navTypeToKeyword[navType];

      const elemToTotalKWCount = KeywordLocator.mapElemToKeywordCount(elements, keywords);

      if (elemToTotalKWCount.size === 0)
        return;

      const sumAppearnces = [...elemToTotalKWCount.values()].reduce((acc, val) => acc + val, 0);

      const candidates = [...elemToTotalKWCount.entries()].map(
        ([elem, allKWCount]) => new CandidateLink(elem, navType, allKWCount / sumAppearnces)
      );

      navTypeToLinkCandidates.set(navType, candidates);
    });

    return NavigationCandidates.fromMap(navTypeToLinkCandidates, this.weight);
  }

  static mapElemToKeywordCount(elements, keywords) {

    const elemToKWCount = new Map();

    elements.forEach(element => {
      keywords.forEach(keyword => {
        const count = this.caseInsensitiveOccurrences(element.outerHTML, keyword)
        if (count > 0) {
          if (elemToKWCount.has(element)) {
            const curCount = elemToKWCount.get(element)
            elemToKWCount.set(element, curCount + count)
          }
          else {
            elemToKWCount.set(element, count)
          }
        }
      });
    });

    return elemToKWCount;

  }

  static caseInsensitiveOccurrences(string, substring) {
    string = string.toLowerCase();
    substring = substring.toLowerCase();
    return this.occurrences(string, substring);
  }

  static occurrences(string, substring) {
    let count = 0;
    let index = string.indexOf(substring);

    while (index !== -1) {
      count++;
      index = string.indexOf(substring, index + 1);
    }
    return count;
  }

}

/**
 * Represents a list of CandidateLink of multiple types for a single url, which is not included. Currently supports just the prev/next types. 
  */
class NavigationCandidates {
  /**
   * @param {CandidateLink[]} prevCandidates
   * @param {CandidateLink[]} nextCandidates
   * @param {number} weight - weight of the navigation candidates. Used later in deciding the best candidate.
   */
  constructor(prevCandidates, nextCandidates, weight= 1) {

    if (!Array.isArray(prevCandidates) || !prevCandidates.every((candidate) => candidate instanceof CandidateLink))
      throw new Error('prevCandidates parameter must be an array of CandidateLinks');


    if (!Array.isArray(nextCandidates) || !nextCandidates.every((candidate) => candidate instanceof CandidateLink))
      throw new Error('nextCandidates parameter must be an array of CandidateLinks');

    this.next = nextCandidates;
    this.prev = prevCandidates;
    this.weight = weight;
  }


  toString() {

    const reduceCandidatesToStr = (str, linkCandidate) => {
      return `${str}\n\t(Conf: ${linkCandidate.confidence},  ${linkCandidate.link})`
    }
    const nextOutput = this.next.reduce(reduceCandidatesToStr, '') || '\n\tNone'
    const prevOutput = this.prev.reduce(reduceCandidatesToStr, '') || '\n\tNone'

    return `Next:${nextOutput}\nPrev:${prevOutput}`
  }

  static EMPTY_NAVIGATION_CANDIDATES = new NavigationCandidates([], [], 0);


  static fromMap(navTypeToCandidates, weight = 1) {
    return new NavigationCandidates(navTypeToCandidates.get(NavType.PREV) || [],
      navTypeToCandidates.get(NavType.NEXT) || [], weight)
  }

  static nonAmbiguousCandidates(prevLink, nextLink, weight) {
    if (!prevLink &&!nextLink)
      throw new Error("At least one of prevLink or nextLink must be provided")

    return new NavigationCandidates(
        prevLink ? [ new CandidateLink(prevLink, NavType.PREV, 1)] : [],
        nextLink ? [new CandidateLink(nextLink, NavType.NEXT, 1)] : [],
        weight)

  }

  /**
   *
   * @param {URL} baseUrl -  url of the current page
   * @param prevLinks - link array of candidates for previous link
   * @param nextLinks - link array of candidates for next link
   * @param weight - weight of the navigation candidates
   * @returns {NavigationCandidates}
   */
  static similarityBased( baseUrl, prevLinks, nextLinks, weight ) {
    return new NavigationCandidates(
        similarityBasedConfidenceCandidates(baseUrl, prevLinks, NavType.PREV),
        similarityBasedConfidenceCandidates(baseUrl, nextLinks, NavType.NEXT), weight)
  }
  /**
   * Merges multiple instances of NavigationCandidates, giving higher confidence to link candidates that appear in multiple instances for the same type. 
   * @param {NavigationCandidates[]} navCandidatesArray - an array of NavigationCandidates arrays. Each representing a result from some Locator
   */
  static mergeNavigationCandidates(navCandidatesArray) {

    const navTypeToCandidates = new Map();

    navTypeToCandidates.set(NavType.PREV, new Map());
    navTypeToCandidates.set(NavType.NEXT, new Map());

    navCandidatesArray.reduce((navTypeToCandidates, navCandidates) => {
      if (!(navCandidates instanceof NavigationCandidates))
        throw new Error('navCandidates must be an array of NavigationCandidates')

      this.reduceNavigationCandidates(navCandidates.prev, navTypeToCandidates.get(NavType.PREV), navCandidates.weight)
      this.reduceNavigationCandidates(navCandidates.next, navTypeToCandidates.get(NavType.NEXT), navCandidates.weight)

      return navTypeToCandidates;

    }, navTypeToCandidates);


    return NavigationCandidates.fromMap(new Map([
      [NavType.PREV,
      [new CandidateLink(this.maxScoreLink(navTypeToCandidates.get(NavType.PREV)), NavType.PREV, 1)]],
      [NavType.NEXT,
      [new CandidateLink(this.maxScoreLink(navTypeToCandidates.get(NavType.NEXT)), NavType.NEXT, 1)]]
    ]));
  }

  static maxScoreLink(linkToScoreMap) {
    const maxLinkScorePair = [...linkToScoreMap.entries()].reduce((max, [link, score]) => {
      if (score > max.score) {
        return { link, score };
      } else {
        return max;
      }
    }, { link: null, score: 0 });

    return maxLinkScorePair.link;
  }

  /**
   * 
   * @param {CandidateLink[]} candidateLinks 
   * @param {Map<string, number>} linkToScoreMap 
   * @param {number} weight 
   * @returns 
   */
  static reduceNavigationCandidates(candidateLinks, linkToScoreMap, weight) {
    return candidateLinks.reduce((linkToScoreMap, candidate) => {
      if (linkToScoreMap.has(candidate.link)) {
        const existingScore = linkToScoreMap.get(candidate.link)
        linkToScoreMap.set(candidate.link,
          existingScore + candidate.confidence * weight)
      }
      else {
        linkToScoreMap.set(candidate.link, candidate.confidence * weight)
      }
      return linkToScoreMap;

    }, linkToScoreMap);
  }

  areHighConfidenceCandidates(threshold = 0.7) {
    return this?.prev?.some(candidate => candidate.confidence >= threshold) &&
      this?.next?.some(candidate => candidate.confidence >= threshold);
  }

  bestCandidates() {
    return {
      prev: maxConfidence(this.prev),
      next: maxConfidence(this.next)
    };

  }

  bestCandidatesLinks() {
    const bc = this.bestCandidates();
    return {
      prevLink: bc?.prev && UrlUtils.toAbsoluteURL(bc.prev.link),
      nextLink: bc?.next && UrlUtils.toAbsoluteURL(bc.next.link)
    };
  }

}



class CandidateLink {
  /**
   * Class represents that a link is of type chapOffset and the confidence it is true. 
   * The offset is relative to an original url that isn't included here. 
   * 
   * @param {HTMLAnchorElement} link
   * @param {number} confidence
   * @param {NavType} navType
   */
  constructor(link, navType, confidence) {
    this.link = link;
    this.navType = navType;
    this.confidence = confidence;
  }
}

function addToMap(map, key, value) {
  if (map.has(key))
    map.set(key, map.get(key) + value)
  else
    map.set(key, value)
}

/**
 * This locator finds the next and previous chapter links by looking for numbers
 * differing by one in the current url and a link url. This locator focuses on the last
 * part of a string being a number, somehting like /chapter-1/ or /chapter1/. It would also
 * catch /chapter/10 .
 * 
 * It differs only slightly from the PageNumberAnywhereLocator as that one looks for a number
 * anywhere.
 */
class PageNumberSuffixLocator extends NavigationLocator {
  constructor(weight = 5) {
    super(weight)
  }

  locate(url, links) {

    let prevLinks = [];
    let nextLinks = [];

    // TODO: Split query parameters as well ?
    const curPathSegments = UrlUtils.toPathSegments(url)

    links.forEach(link => {
      const link_path = UrlUtils.toPathSegments(link)

      for (let i = 0; i < link_path.length; i++) {

        if (curPathSegments?.[i] === link_path[i])
          continue;

        if ( !curPathSegments?.[i] ) {
          //TODO: Should I handle extra segment of chapter only on the link ? Anywhere sort of does that.
          continue;
        }

        if (curPathSegments[i].length + 1 >= link_path[i].length) {

          const curPathNumber = UrlUtils.extractNumberSuffixFromString(curPathSegments[i])
          const linkChapNumber = UrlUtils.extractNumberSuffixFromString(link_path[i])

          if (!curPathNumber || !linkChapNumber)
            continue;

          switch (offsetToNavType(curPathNumber, linkChapNumber)) {
            case NavType.NEXT:
              nextLinks.push(link)
              break;
            case NavType.PREV:
              prevLinks.push(link)
              break;
          }
        }
      }
    });

    return NavigationCandidates.similarityBased(url, prevLinks, nextLinks, this.weight);
  }
}


/** 
 * This locator finds the next and previous chapter links by looking for numbers
 * differing by one in the current url and a link url. This locator looks for the number everywhere
 * so it will catch things like /chapter-1-chapter-name or /2-chapter-name
 * 
 * This locator will just ignore a link if there are multiple numbers in the link that are offset
 * by one from the passed URL. The idea is we can't trivially make a judgement and since this
 * locator is relatively permissive, we just ignore it.  
 * 
 * This locator also handles the case where the current page has no number, but
 * there is a link to a next page with a number of 0,1 or 2 implying a pseudo chapter 
 * number of -1,0 or 1 for the current page. In the case where I find a link to a next of 1 and 2,
 * I prefer the 1.  
 */
class PageNumberAnywhereLocator extends NavigationLocator {
  constructor(weight = 3) {
    super(weight)
  }

  locate(url, links) {

    let prevLinks = [];
    let nextLinks = [];

    if (!links || links.length < 1)
      throw new Error(`links must be a non empty array of HTMLAnchorElement`)

    links.forEach(link => {
      const offset = PageNumberAnywhereLocator.findCnumAnywhereInPath(url, new URL(link.href))

      switch (offset) {
        case NavType.NEXT:
          nextLinks.push(link);
          break;
        case NavType.PREV:
          prevLinks.push(link);
          break;
      }

    });

    return NavigationCandidates.similarityBased(url, prevLinks, nextLinks, this.weight);
  }

  locateNew(curURL, links) {

    let prevLinks = [];
    let nextLinks = [];

    if (!links || links.length < 1)
      throw new Error(`links must be a non empty array of HTMLAnchorElement`)

    const curSegments = UrlUtils.toPathSegments(curURL)

    // Represents link to the next page if I guess the current page number of main is matchedPseduoNum.
    let matchedPseduoNum = null
    let pseudoNextLink = null

    links.forEach(link => {
      const linkSegments = UrlUtils.toPathSegments(link)
      let linkAssumedMainPseudoNum;

      let detectedOffsets = []
      for (let [i, linkSeg] of linkSegments.entries()) {
        const curSeg = curSegments?.[i];
        let linkType;      
        [linkType, linkAssumedMainPseudoNum] = PageNumberAnywhereLocator.findCnumInSegments(curSeg, linkSeg)

        if (linkType !== NavType.INVALID)
          detectedOffsets.push(linkType)
      }

      if (detectedOffsets?.length !== 1)
        return

      const offset = detectedOffsets[0]

      switch (offset) {
        case NavType.NEXT:
          if (!matchedPseduoNum && linkAssumedMainPseudoNum) {
            matchedPseduoNum = linkAssumedMainPseudoNum
            pseudoNextLink = link
          }
          else {
            if (matchedPseduoNum && linkAssumedMainPseudoNum &&
              matchedPseduoNum > linkAssumedMainPseudoNum) {
              matchedPseduoNum = linkAssumedMainPseudoNum
              pseudoNextLink = link
            }
          }

          if (!linkAssumedMainPseudoNum)
            nextLinks.push(link);
          break;
        case NavType.PREV:
          prevLinks.push(link);
          break;
      }
    });

    if (nextLinks.length > 0 && pseudoNextLink)
      console.warn("Something is wrong, I shouldn't be guessing the cur page number if another way is possible.")

    if (nextLinks.length === 0 && pseudoNextLink)
      nextLinks.push(pseudoNextLink)

    return new NavigationCandidates(
      similarityBasedConfidenceCandidates(curURL, prevLinks, NavType.PREV),
      similarityBasedConfidenceCandidates(curURL, nextLinks, NavType.NEXT), this.weight);
  }

  /**
   * I'm only going to use this strategy if I find a single matching segment, otherwise 
   * things get too convoluted for this phase of link detection.
   * 
   *
   * @param {Location} curURL 
   * @param {URL} testLink 
   * @returns 
   */
  static findCnumAnywhereInPath(curURL, testLink) {

    if (!curURL || !testLink)
      return NavType.INVALID;

    const curSegments = UrlUtils.toPathSegments(curURL)
    const testSegments = UrlUtils.toPathSegments(testLink)

    let pathType = [];

    // TODO: Switch to work on the testSegments since the curLink can have no number
    curSegments.forEach((segmentA, i) => {

      const numbers = UrlUtils.extractAnyCnumFromString(segmentA)
      const testNumbers = testSegments?.[i] && UrlUtils.extractAnyCnumFromString(testSegments[i])

      if (!testNumbers)
        return null;


      if (numbers?.length === 1 && testNumbers?.length === 1) {
        const segOffset = offsetToNavType(numbers[0], testNumbers[0])
        
        segOffset !== NavType.INVALID && pathType.push(segOffset)
      }


      //Sometimes the main/first page of a website will have no number. The next page will then be either 0/1/2
      if (!numbers && testNumbers.length === 1) {
        for (const pseudoMainPageNum of [0, 1, -1]) {
          const segOffset = offsetToNavType(pseudoMainPageNum, testNumbers[0])
          if (segOffset !== NavType.INVALID) {
            pathType.push(segOffset)
            break; //only one pseudoMainPageNumber is correct.
          }
        }
      }
    })

    return pathType.length === 1 ? pathType[0] : NavType.INVALID;
  }

  static findCnumInSegments(curSeg, linkSeg) {

    const linkNumbers = UrlUtils.extractAnyCnumFromString(linkSeg)

    if (!linkNumbers || linkNumbers?.length > 1)
      return [NavType.INVALID];

    const urlSegNumbers = curSeg && UrlUtils.extractAnyCnumFromString(curSeg)

    if (urlSegNumbers?.length === 1 && linkNumbers?.length === 1)
      return [offsetToNavType(urlSegNumbers[0], linkNumbers[0])]

      //TODO: Move this logic to the suffix. Matching a number anywhere already catches to much. To also accept 
      //  any 0/1/2 is just pointless
    // //Sometimes the main/first page of a website will have no number. The next page will then be either 0/1/2
    // if (!urlSegNumbers && linkNumbers.length === 1) {
    //   for (const pseudoMainPageNum of [0, 1, -1]) {
    //     const segOffset = offsetToNavType(pseudoMainPageNum, linkNumbers[0])
    //     if (segOffset === NavType.NEXT) {
    //       return [segOffset, pseudoMainPageNum]; //only one pseudoMainPageNumber can match          
    //     }
    //   }
    // }

    return [NavType.INVALID];
  }

}
/**
 * 
 * Converts the list of links to a list of CandidateLink of the passed navType each with equal probability. 
 * @param {[HTMLAnchorElement]} links
 * @param {NavType} navType 
 * @returns {CandidateLink[]}- a list of CandidateLink
 */
function equalConfidenceCandidates(links, navType) {
  if (!links?.length)
    return []

  if (!navType || !Object.values(NavType).includes(navType))
    throw new Error('navType must be a value of type NavType')

  return links.map(link => new CandidateLink(link, navType, 1 / links.length))
}

/**
 * 
 * @param {URL} originalURL 
 * @param {HTMLAnchorElement[]} links 
 * @param {NavType} navType
 * @returns 
 */
function similarityBasedConfidenceCandidates(originalURL, links, navType) {
  if (!links?.length)
    return []

  if (!navType || !Object.values(NavType).includes(navType))
    throw new Error('navType must be a value of type NavType')

  return links.map(link => {
    const editDistance = Levenshtein.get(originalURL.href, link.href)
    return new CandidateLink(link, navType, editDistance === 1 ? 1 : editDistance === 2 ? .7 : (1 / links.length + 1 / editDistance))
  })
}

/**
 * 
 * @param {CandidateLink[]} candidates 
 * @returns {CandidateLink} - highest confidence candidate
 */
function maxConfidence(candidates) {

  if (!candidates || candidates.length === 0)
    return null;

  if (candidates.length === 1)
    return candidates[0];

  return candidates.reduce((max, candidate) => {
    if (candidate.confidence > max.confidence) {
      return candidate;
    } else {
      return max;
    }
  }, candidates[0]);

}

function offsetToNavType(a, b) {
  if (a - b === -1) {
    return NavType.NEXT;
  } else if (a - b === 1) {
    return NavType.PREV;
  } else {
    return NavType.INVALID;
  }
}

/**
 * 
 * Extracts all potential links.
 * 
 * @param {Document} doc 
 * @returns {HTMLAnchorElement[]} links - The next and previous chapter links.
 */
function extractPotentialLinks(doc) {

  const allLinks = doc.querySelectorAll('a[href]:not([href="javascript:void(0)"])');

  if (allLinks.length === 0) {
    console.warn('No links found for next/prev chapter. Extend strategy.');
    return;
  }

  return UrlUtils.processLinks(allLinks, doc.location);
}

/**
 * 
 * Extracts the next and previous chapter links for the passed document.
 * 
 * @param {Document} doc 
 * @returns {{next: string | undefined, prev: string | undefined}} - The next and previous chapter links.
 */
function extractChapLinks(doc) {

  const links = extractPotentialLinks(doc);

  if ( !(links?.length > 1) ){
    return {next: null, prev: null}
  }

  const curLocation = doc.location;

  const relLocator = new RelLocator();

  const relCandidates = relLocator.locate(curLocation, links);

  if (relCandidates.areHighConfidenceCandidates())
    return relCandidates.bestCandidatesLinks();

  const suffixNumberLocator = new PageNumberSuffixLocator()
  const suffixCandidates = suffixNumberLocator.locate(curLocation, links)

  console.log(`Suffix candidates\n: ${suffixCandidates.toString()}`)
  // if ( suffixCandidates.areHighConfidenceCandidates())
  //   return suffixCandidates.bestCandidatesLinks();  

  const chapterNumberAnywhereLocator = new PageNumberAnywhereLocator();
  const anywhereCandidates = chapterNumberAnywhereLocator.locate(curLocation, links)
  console.log(`Anywhere candidates\n: ${anywhereCandidates.toString()}`)

  // if (anywhereCandidates.areHighConfidenceCandidates()) {
  //   return anywhereCandidates.bestCandidatesLinks()
  // }

  const keywordLocator = new KeywordLocator();
  const keywordCandidates = keywordLocator.locate(null, links)
  console.log(`Keyword candidates\n: ${keywordCandidates.toString()}`)

  // if (keywordCandidates.areHighConfidenceCandidates()) {
  //   return keywordCandidates.bestCandidatesLinks()
  // }

  return NavigationCandidates.mergeNavigationCandidates([suffixCandidates, anywhereCandidates, keywordCandidates]).bestCandidatesLinks()

}



// let imports = {}

if (typeof module !== "undefined" && module !== null && typeof exports !== "undefined" && module.exports === exports) {
  module.exports = {
    PageNumberSuffixLocator, PageNumberAnywhereLocator,
    KeywordLocator, extractPotentialLinks, UrlUtils
  };

}
