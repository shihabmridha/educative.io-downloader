import { mkdir } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { BrowserTab, ChromeBrowser } from './browser';
import { CourseMeta, PageTitleAndLink } from './types';
import { isExists, isExistsSync, waitFor } from './utils';
import { Configuration } from './configuration';

export class Download {
  private readonly _config: Configuration;
  private readonly _browser: ChromeBrowser;
  private readonly _downloadsDirectoryPath: string;
  private _courseDownloadPath: string;
  // private readonly _saveAs: SaveAs;
  // private readonly _multiLanguage: boolean;
  // private _existingDirectories: Set<string>;

  constructor(config: Configuration, browser: ChromeBrowser) {
    this._browser = browser;
    this._config = config;
    this._downloadsDirectoryPath = `${this._config.rootDir}/downloads`;

    if (!isExistsSync(this._downloadsDirectoryPath)) {
      mkdirSync(this._downloadsDirectoryPath);
    }

    console.log(`Saving as: ${config.userConfig.saveAs}`);
  }

  private buildCourseDetailApiUrl(slug: string) {
    return `${this._config.apiUrl}/collection/${slug}?work_type=collection`;
  }

  private async createCourseDirectory(title: string) {
    console.log('Creating course directory');

    const dirExists = await isExists(`${this._downloadsDirectoryPath}/${title}`);
    if (!dirExists) {
      await mkdir(`${this._downloadsDirectoryPath}/${title}`);
    }
  }

  private async downloadPage(linkWithTitle: PageTitleAndLink, pageNumber: number) {
    const { title, link } = linkWithTitle;
    let tab: BrowserTab;
    try {
      const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

      console.log(`Downloading => ${title} - (${link})`);

      await this._browser.makeSpecial();
      tab = await this._browser.newTab();

      await tab.goTo({ url: link, waitUntil: 'networkidle2' });

      // Hoping that PageDown would scroll to the end of the page and will render any lazy loaded component
      await tab.page.keyboard.press("End");

      await waitFor(1000);

      await tab.page.evaluate(() => {
        // Show solution to exercise
        document.querySelectorAll('span').forEach(e => {
          if (e.innerHTML === 'Show Solution') e.click();
        });
        document.querySelectorAll('button').forEach(e => {
          if (e.innerHTML === 'No, just show the solution') e.click();
        });

        // Hide header
        document.querySelectorAll('nav.sticky')
          .forEach(e => (e as HTMLElement).style.display = 'none');

        // Hide sidebar
        document.querySelectorAll('nav.no-scrollbar')
          .forEach(e => (e as HTMLElement).style.display = 'none');

        // Hide top-right sticky buttons & right-bottom floating buttons
        document.getElementById('view-collection-article-content-root')
          .querySelectorAll('.fixed')
          .forEach(e => (e as HTMLElement).style.display = 'none');

        // Hide bottom navigation buttons
        const bottomNavItem = document.getElementsByClassName('mt-12 flex flex-col');
        if (bottomNavItem?.length === 1) {
          (bottomNavItem[0] as HTMLElement).style.display = 'none';
        } else {
          console.warn('Could not hide the bottom navigation menu');
        }

        // Hide table of content if any
        if (document.querySelector('[data-testid="toc-wrap"]'))
          (document.querySelector('[data-testid="toc-wrap"]') as HTMLElement).style.display = 'none';

        // Hide modal if there is any (sometimes a modal appears)
        if (document.querySelector('#NEW_MODAL'))
          (document.querySelector('#NEW_MODAL') as HTMLElement).style.display = 'none';
      });

      await tab.savePage(`${this._courseDownloadPath}/${pageNumber}.${normalizedTitle}`);
      // await savePage(page, `${this._courseDownloadPath}/${pageNumber}.${normalizedTitle}`);
    } catch (error) {
      console.error('Failed to download ', link);
      console.error('Reason:', error.message);
    }

    await tab.close();
  }

  async course() {
    const url = this._config.userConfig.courseUrl;
    console.log(`Navigating to courses page. URL: ${url}`);
    const courseSlug = url.split('/').pop();
    await this._browser.makeSpecial();

    const tab = await this._browser.getTab();
    const page = tab.page;

    const courseDetailApiUrl = this.buildCourseDetailApiUrl(courseSlug);
    const [response] = await Promise.all([
      page.waitForResponse(courseDetailApiUrl, { timeout: this._config.httpTimeout }),
      tab.goTo({ url })
    ]);

    if (response.status() !== 200) {
      console.error('Failed to get course information');
      return;
    }

    const body = await response.json();

    const courseTitle: string = body?.instance?.details?.title;
    const slugs: CourseMeta = body?.instance?.details?.page_slugs;
    const titles: CourseMeta = body?.instance?.details?.page_titles;

    const slugList = Object.keys(slugs);

    if (slugList.length === 0) {
      console.error('Failed to fetch page slugs for the course');
      return;
    }

    console.log(`Course title: ${courseTitle}`);
    console.log(`Total pages: ${slugList.length}`);

    const pageLinks = slugList.map(id => {
      const title = titles[id];
      const slug = slugs[id];

      return {
        title,
        link: `${this._config.baseUrl}/courses/${courseSlug}/${slug}`,
      } as PageTitleAndLink;
    });


    await this.createCourseDirectory(courseTitle);
    this._courseDownloadPath = this._downloadsDirectoryPath + '/' + courseTitle;

    console.log(`Total lessons: ${pageLinks.length}`);

    let pageNumber = 1;
    while (pageLinks.length > 0) {
      try {
        await Promise.all(pageLinks.splice(0, this._config.batchSize)
          .map((pageLink) => this.downloadPage(pageLink, pageNumber++)));
      } catch (error) {
        console.error(error.message);
      }
    }
  }
}

// export async function getDownloadableCourses(url: string, cursor: string = ''): Promise<string[]> {
//   await browser.makeSpecial();

//   const tab = await browser.getTab();

//   await tab.goto(url + cursor, { timeout: config.httpTimeout, waitUntil: 'networkidle0' });

//   const response = await page.evaluate(() => {
//     return document.querySelector('body').innerText;
//   });

//   const availableCourses: AvailableCourses = JSON.parse(response);

//   for (const availableCourse of availableCourses.summaries) {
//     if (availableCourse.discounted_price === 0.0 || availableCourse.owned_by_reader) {
//       COURSE_URL_SLUG_LIST.push(availableCourse.course_url_slug);
//     }
//   }

//   if (availableCourses.summaries.length > 1) {
//     console.log(`Found ${availableCourses.summaries.length} courses to download on this page.`);
//   } else {
//     console.log(`Found ${availableCourses.summaries.length} course to download on this page.`);
//   }

//   if (availableCourses.more) {
//     await getDownloadableCourses(url, availableCourses.cursor);
//   }

//   return COURSE_URL_SLUG_LIST;
// }

// export async function downloadCourse(courseUrl: string) {
//   console.log(`Navigating to courses page. URL: ${courseUrl}`);
//   const courseSlug = courseUrl.split('/').pop();
//   await browser.makeSpecial();

//   const page = await browser.getTab();


//   const [response] = await Promise.all([
//     page.waitForResponse(`${config.baseUrl}/api/collection/${courseSlug}?work_type=collection`, { timeout: config.httpTimeout }),
//     page.goto(courseUrl, { timeout: config.httpTimeout, waitUntil: 'domcontentloaded' })
//   ]);

//   // https://www.educative.io/api/collection/grokking-the-behavioral-interview

//   if (response.status() !== 200) {
//     console.error('Failed to get course information');
//     return;
//   }

//   const body = await response.json();

//   interface CourseMeta {
//     [key: string]: string;
//   }

//   const courseTitle: string = body?.instance?.details?.title;
//   const slugs: CourseMeta = body?.instance?.details?.page_slugs;
//   const titles: CourseMeta = body?.instance?.details?.page_titles;

//   if (Object.keys(slugs).length === 0) {
//     console.error('Failed to fetch page slugs for the course');
//     return;
//   }

//   const pageLinks = Object.keys(slugs).map(id => {
//     const title = titles[id];
//     const slug = slugs[id];

//     return {
//       title,
//       link: `${config.baseUrl}/courses/${courseSlug}/${slug}`,
//     } as PageTitleAndLink;
//   });

//   // Create downloads folder
//   if (!(await isExists(`${config.rootDir}/downloads`))) {
//     await mkdir(`${config.rootDir}/downloads`);
//   }

//   console.log('Creating course directory');

//   // Create course folder
//   if (!(await isExists(`${config.rootDir}/downloads/${courseTitle}`))) {
//     await mkdir(`${config.rootDir}/downloads/${courseTitle}`);
//   }

//   SAVE_DESTINATION = config.rootDir + '/downloads/' + courseTitle;

//   // const pageLinks: PageTitleAndLink[] = await fetchLessonUrls(courseUrl);

//   console.log(`Total lessons: ${pageLinks.length}`);

//   let pageNumber = 1;
//   while (pageLinks.length > 0) {
//     try {
//       await Promise.all(pageLinks.splice(0, config.batchSize).map(async (page) => {
//         await downloadPage(`${pageNumber++}.${page.title}`, page.link);
//       }));
//     } catch (error) {
//       console.error(error.message);
//     }
//   }
// }

// async function downloadPage(title: string, link: string): Promise<void> {
//   let activeBrowser: Browser;
//   let page: Page;

//   try {
//     // await page.click('[aria-label="toggle sidebar"]');
//     // document.querySelector()
//     const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

//     if ((await isAlreadyDownloaded(normalizedTitle))) {
//       console.log(`Already downloaded ${title}`);
//       return;
//     }

//     console.log(`Downloading => ${title} - (${link})`);

//     activeBrowser = await browser.makeSpecial();
//     page = await activeBrowser.newPage();

//     await page.goto(link, { timeout: config.httpTimeout, waitUntil: 'networkidle2' });

//     // await page.addStyleTag({ content: 'div[class^="styles__PrevNextButtonWidgetStyled"], div[class^="styles__Footer"], nav { display: none !important; }' });

//     // await page.addStyleTag({ content: 'div[class^="styles__CodeEditorStyled-sc"]{ height: 5000px !important; }' });
//     // await page.addStyleTag({ content: 'div[class^="PageContent"]{ max-width: 1000px !important; }' });
//     /**
//      * The callback function passed to evaluate is actually executed in the browser.
//      * This is why we have to pass local variables explicitly in the second parameter.
//      */
//     const languages = await page.evaluate(pageEvaluation, { SAVE_AS, SAVE_LESSON_AS: SaveAs });

//     // click the buttons
//     await page.evaluate(buttonClicks);

//     await page.evaluate(() => {
//       // Show Solution Code.
//       // TODO : Find some other best way to create showSolution method and use it other places.
//       // Currently the problem is when the showSolution method is passed as parameter to page evaluate it is not working as expected.
//       (window as any).showSolution = async function showSolution() {
//         async function waitFor(delay: number) {
//           return await new Promise((resolve) => setTimeout(resolve, delay));
//         }

//         // Show Solution Button Click
//         try {
//           const showSolutionXPath = document.evaluate('//button[span[text()="Show Solution"]]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//           for (let i = 0; i < showSolutionXPath.snapshotLength; i++) {
//             const showSolutionElement = showSolutionXPath.snapshotItem(i) as HTMLElement;
//             showSolutionElement.click();
//             const noJustShowXPath = document.evaluate('//span[text()="No, just show the solution"]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//             for (let j = 0; j < noJustShowXPath.snapshotLength; j++) {
//               const noJustShowElement = noJustShowXPath.snapshotItem(j) as HTMLElement;
//               noJustShowElement.click();
//               await waitFor(1000);
//             }
//           }
//         } catch (error) {
//           console.log('\x1b[31m', error, '\x1b[0m');
//           throw error;
//         }

//         const correctSolutionStyle = document.querySelectorAll('[class*="styles__Caption-sc"]');

//         correctSolutionStyle.forEach((item) => {
//           item.className = '';
//         });

//         // Monaco Content
//         try {
//           const monacoEditorContainer = document.evaluate('//div[contains(@class, "monaco-editor")]/ancestor::div[contains(@class, "styles__CodeEditorStyled")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//           // Add custom class to div surrounding. So that we can handle easily in for loop.
//           for (let i = 0; i < monacoEditorContainer.snapshotLength; i++) {
//             const addClass = monacoEditorContainer.snapshotItem(i).parentNode as HTMLElement;
//             addClass.className = 'rale' + i;
//           }

//           const raleDivs = document.evaluate('//div[contains(@class, "rale")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//           for (let i = 0; i < raleDivs.snapshotLength; i++) {
//             const linesContent = document.evaluate('//div[contains(@class, "rale' + i + '")]/descendant::div[contains(@class, "styles__CodeEditorStyled-sc")]/descendant::div[contains(@class, "lines-content")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//             const raleWithCodeEditor = document.evaluate('//div[contains(@class, "rale' + i + '")]/descendant::div[contains(@class, "styles__CodeEditorStyled-sc")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//             if (linesContent.snapshotLength > 0) {
//               let allCodeContent = '';

//               const textBoxContent = linesContent.snapshotItem(0) as HTMLDivElement;
//               if (textBoxContent !== null) {
//                 allCodeContent += textBoxContent.innerText;
//               }

//               const createCodeElement = document.createElement('PRE');
//               createCodeElement.style.cssText = 'width:100%;';
//               createCodeElement.innerHTML = allCodeContent;

//               const parentOfWidgetMultiFiles = raleDivs.snapshotItem(i) as HTMLElement;
//               parentOfWidgetMultiFiles.appendChild(createCodeElement);

//               const needToRemove = raleWithCodeEditor.snapshotItem(0) as HTMLElement;
//               needToRemove.remove();
//             }
//           }
//         } catch (error) {
//           console.log('\x1b[31m\n\n', error, '\x1b[0m');
//           throw error;
//         }
//       };
//     });

//     /**
//      * If lesson has multiple language and user set multiLanguage to true then download all language.
//      */
//     if (languages.length > 1 && MULTI_LANGUAGE) {
//       for (const language of languages) {
//         if (!IS_DIRECTORY_EXISTS[language] && !(await isExists(`${SAVE_DESTINATION}/${language}`))) {
//           // Create language dir
//           await mkdir(`${SAVE_DESTINATION}/${language}`);

//           IS_DIRECTORY_EXISTS[language] = true;
//         }

//         if ((await isAlreadyDownloaded(normalizedTitle, language))) {
//           console.log(`Already downloaded ${title} (${language})`);
//           continue;
//         }

//         const path = `${SAVE_DESTINATION}/${language}/${normalizedTitle}`;

//         await page.evaluate(async (language) => {
//           const codeContainer = document.getElementsByClassName('code-container');
//           let len = codeContainer.length;
//           while (len > 0) {
//             const targetNode = codeContainer[--len].previousSibling;
//             if (targetNode?.firstChild) {
//               const languageTabs = (targetNode.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
//               languageTabs.forEach((e) => {
//                 if (e.querySelector('span').innerText === language) {
//                   e.querySelector('span').click();
//                 }
//               });

//               const hideSol = document.evaluate('//button[span[text()="Hide Solution"]]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//               for (let i = 0; i < hideSol.snapshotLength; i++) {
//                 const hideEle = hideSol.snapshotItem(i) as HTMLElement;
//                 hideEle.click();
//               }

//               await waitFor(1000);
//               // Break after switching language
//               break;
//             }
//           }

//           async function waitFor(delay: number) {
//             return await new Promise((resolve) => setTimeout(resolve, delay));
//           }

//           // invoke showSolution method.
//           const showSolution = (window as any).showSolution;
//           await showSolution();
//         }, language);

//         // waiting 1 seconds just to be sure language has been changed
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         await savePage(page, path);
//       }
//     } else {
//       await page.evaluate(async () => {
//         // invoke showSolution method.
//         const showSolution = (window as any).showSolution;
//         await showSolution();
//       });

//       const path = `${SAVE_DESTINATION}/${normalizedTitle}`;
//       await savePage(page, path);
//     }
//   } catch (error) {
//     console.log('Failed to download ', link);
//     console.log('Reason:', error.message);
//   }

//   if (page) {
//     await page.close();
//   }
// }

// Before Saving check for errors.
// async function savePage(page: Page, path: string) {
//   await page.evaluate(async () => {
//     async function waitFor(delay: number) {
//       return await new Promise(resolve => setTimeout(resolve, delay));
//     }

//     await waitFor(500);

//     // Check Unexpected Error : Some times page throw unexpected error.
//     try {
//       const errorOccured = document.evaluate('//h2[text()="An unexpected error has occurred."]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//       if (errorOccured.snapshotLength > 0) {
//         const err = new Error('Error Occured in Page');
//         console.log('\x1b[31m\n\n', err, '\x1b[0m');
//         throw err;
//       }
//     } catch (error) {
//       console.log('\x1b[31m\n\n', error, '\x1b[0m');
//       throw error;
//     }

//     // Check Unexpected Error : If the page is empty. Happens due to no valid login.
//     try {
//       const bdy = document.evaluate('//body', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       const chdnodes = bdy.snapshotItem(0).childNodes;
//       if (chdnodes.length == 0) {
//         const error = new Error('Empty Page!');
//         console.log('\x1b[31m\n\n', error, '\x1b[0m');
//         throw error;
//       }
//     } catch (error) {
//       console.log('\x1b[31m\n\n', error, '\x1b[0m');
//       throw error;
//     }

//     // Check Unexpected Error : Suddenly Logout happens, Then we should check Login button and throw error.
//     try {
//       const noContent = document.evaluate('(//div[contains(@class, "fade-container")])[last()]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//       const loginButt = document.evaluate('//button[span[text()="LOGIN"]]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//       if (noContent.snapshotLength > 0) {
//         const fc = noContent.snapshotItem(0) as HTMLElement;
//         if (fc.childNodes.length == 0) {
//           const error = new Error('Empty Page!');
//           console.log('\x1b[31m\n\n', error, '\x1b[0m');
//           throw error;
//         }
//       }

//       if (loginButt.snapshotLength > 0) {
//         const fc = loginButt.snapshotItem(0) as HTMLElement;
//         if (fc.childNodes.length == 0) {
//           const error = new Error('LOGIN PAGE !');
//           console.log('\x1b[31m\n\n', error, '\x1b[0m');
//           throw error;
//         }
//       }
//     } catch (error) {
//       console.log('\x1b[31m\n\n', error, '\x1b[0m');
//       throw error;
//     }
//   });

//   if (SAVE_AS === SaveAs.PDF) {
//     await savePageAsPDF(page, path);
//   } else {
//     await savePageAsMHTML(page, path);
//   }
// }

/**
* We perform 4 major DOM manipulation here.
* 1. Expand all the slides.
* 2. As MHTML is unable to load complex svg's, convert svg image in data url, remove unescape characters and then load image.
* 3. Remove header/sidebar/footer etc. Mostly formatting.
* 4. Extract available languages of code snippet to download them all in respective folder.
*/
// async function pageEvaluation({ SAVE_AS, SAVE_LESSON_AS }) {
//   // Convert SVG image into Data URL and  also get rid of unescape characters
//   const parentElements = document.getElementsByClassName('canvas-svg-viewmode');
//   for (let i = 0; i < parentElements.length; i++) {
//     const parentElement = parentElements[i];
//     const svgElement = parentElement.getElementsByTagName('svg')[0];

//     const imageTags = svgElement.getElementsByTagName('image');
//     for (let j = 0; j < imageTags.length; j++) {
//       const imageTag = imageTags[j];
//       const blob = await fetch(imageTag.getAttribute('xlink:href')).then(async (r) => await r.blob());
//       const dataUrl = await new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => { resolve(reader.result); };
//         reader.readAsDataURL(blob);
//       });
//       imageTag.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl.toString());
//     }
//     const svgString = new XMLSerializer().serializeToString(svgElement);
//     const decoded = unescape(encodeURIComponent(svgString));
//     parentElement.innerHTML = decoded;
//   }

//   // Remove top & left space
//   const node = document.getElementById('view-collection-article-content-root');
//   if (SAVE_AS === SAVE_LESSON_AS.PDF) {
//     node?.childNodes[0]?.childNodes[0]?.childNodes[0]?.remove();
//   } else {
//     node.style.cssText = 'margin-top: -70px';

//     const content = node?.childNodes[0]?.childNodes[0]?.childNodes[1]?.childNodes[0]?.childNodes[0];
//     node?.childNodes[0]?.childNodes[0]?.childNodes[1]?.appendChild(content);
//     node?.childNodes[0]?.childNodes[0]?.childNodes[0]?.remove();
//   }

//   // Fetch available language of code snippets
//   const languages = [];
//   const codeContainer = document.getElementsByClassName('code-container');
//   if (codeContainer.length === 0) {
//     return languages;
//   }

//   let len = codeContainer.length;
//   while (len > 0) {
//     const targetNode = codeContainer[--len].previousSibling;
//     if (targetNode?.firstChild) {
//       const languageTabs = (targetNode.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
//       languageTabs.forEach((e) => {
//         languages.push(e.querySelector('span').innerText);
//       });

//       // Break when language list found.
//       break;
//     }
//   }

//   return languages;
// }

// async function buttonClicks() {
//   // Slides :  Expand all slides in the page
//   try {
//     const xPathResult = document.evaluate('//button[contains(@class, "AnimationPlus")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//     for (let i = 0; i < xPathResult.snapshotLength; i++) {
//       const element = xPathResult.snapshotItem(i) as HTMLElement;
//       element.click();
//     }
//   } catch (error) {
//     console.log('\x1b[31m', error, '\x1b[0m');
//     throw error;
//   }

//   // IDECode : Click all solutions in IDE code block, copy text and append at end of the page.
//   try {
//     const codeContainerDivs = document.evaluate('//div[contains(@class, "Widget__FilesList")]/div[contains(@class, "styles__Files")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//     const widgetMultiFilesDiv = document.evaluate('//div[contains(@class, "code-container")]/div[contains(@class, "Widget__MultiFiles")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//     for (let i = 0; i < codeContainerDivs.snapshotLength; i++) {
//       const codeContainer = codeContainerDivs.snapshotItem(i);
//       const codeFileDiv = codeContainer.childNodes;
//       codeFileDiv.forEach((item) => {
//         const codeFileLink = item as HTMLDivElement;
//         codeFileLink.click();

//         const codeContent = document.evaluate('//div[contains(@class, "cmcomp-single-editor-container")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//         for (let j = 0; j < codeContent.snapshotLength; j++) {
//           if (i === j) {
//             let allCodeContent = '';
//             allCodeContent += '\n---------------------------------------------------------------------------------------------------\n';
//             allCodeContent += codeFileLink.innerText;
//             allCodeContent += '\n---------------------------------------------------------------------------------------------------\n\n';

//             const textBoxContent = codeContent.snapshotItem(j) as HTMLDivElement;

//             allCodeContent += textBoxContent.innerText;

//             setTimeout(function () {
//               textBoxContent.innerText = 'All code files are copied below...';
//             }, 1);

//             const createCodeElement = document.createElement('PRE');
//             createCodeElement.style.cssText = 'width:100%;';
//             createCodeElement.innerHTML = allCodeContent;

//             const parentOfWidgetMultiFiles = widgetMultiFilesDiv.snapshotItem(i) as HTMLElement;
//             parentOfWidgetMultiFiles.appendChild(createCodeElement);
//           }
//         }
//       });
//     }
//   } catch (error) {
//     console.log('\x1b[31m', error, '\x1b[0m');
//     throw error;
//   }

//   // Some useful buttons inside page click.
//   const buttonsToClick = [
//     'Show Hint',
//     'Show Useful Info',
//     'Show Answer',
//     'Need Hint?',
//     'Privacy Notice',
//     'Product manager',
//     'Project manager',
//     'Software engineer',
//     'Engineering manager',
//     'Answer',
//     'Rubric',
//     'What the interviewer is listening for ',
//     'Self-assessment',
//     'Self-assesment'
//   ];

//   buttonsToClick.forEach((buttonText) => {
//     try {
//       const buttonTextXpath = document.evaluate('//button[span[text()="' + buttonText + '"]]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       for (let i = 0; i < buttonTextXpath.snapshotLength; i++) {
//         const buttonTextXpathElement = buttonTextXpath.snapshotItem(i) as HTMLElement;
//         buttonTextXpathElement.click();
//       }
//     } catch (error) {
//       console.log('\x1b[31m', error, '\x1b[0m');
//       throw error;
//     }
//   });

//   // Show Explanation button click
//   try {
//     const buttonTextXpath = document.evaluate('//h4[text()="Show Explanation"]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//     for (let i = 0; i < buttonTextXpath.snapshotLength; i++) {
//       const showSolutionElement = buttonTextXpath.snapshotItem(i) as HTMLElement;
//       showSolutionElement.click();
//     }
//   } catch (error) {
//     console.log('\x1b[31m\n\n', error, '\x1b[0m');
//     throw error;
//   }

//   // FOR UL Links Code.
//   try {
//     const codeTabLinks = document.evaluate('//div[contains(@class, "styles__ViewerComponentViewStyled")]/descendant::ul[contains(@class, "styles__TabNav")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//     // Add custom class to div surrounding. So that we can handle easily in for loop.
//     for (let i = 0; i < codeTabLinks.snapshotLength; i++) {
//       const addClass = codeTabLinks.snapshotItem(i).parentNode.parentNode as HTMLElement;
//       addClass.className = 'devd' + i;
//     }

//     const devdDivs = document.evaluate('//div[contains(@class, "devd")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//     for (let i = 0; i < devdDivs.snapshotLength; i++) {
//       const kale = document.evaluate('//div[contains(@class, "devd' + i + '")]/descendant::span[contains(@class, "styles__DesktopOnly-sc")]/descendant::span[contains(@class, "styles__TabTitle-sc")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//       for (let k = 0; k < kale.snapshotLength; k++) {
//         const codeFileLink = kale.snapshotItem(k) as HTMLElement;
//         codeFileLink.click();

//         const devdWithCodeContainer = document.evaluate('//div[contains(@class, "devd' + i + '")]/descendant::div[contains(@class, "code-container")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

//         let allCodeContent = '';
//         allCodeContent += '\n---------------------------------------------------------------------------------------------------\n';
//         allCodeContent += codeFileLink.innerText;
//         allCodeContent += '\n---------------------------------------------------------------------------------------------------\n\n';

//         const textBoxContent = devdWithCodeContainer.snapshotItem(0) as HTMLDivElement;
//         allCodeContent += textBoxContent.innerText;

//         const createCodeElement = document.createElement('PRE');
//         createCodeElement.style.cssText = 'width:100%;';
//         createCodeElement.innerHTML = allCodeContent;

//         const parentOfWidgetMultiFiles = devdDivs.snapshotItem(i) as HTMLElement;
//         parentOfWidgetMultiFiles.appendChild(createCodeElement);
//       }

//       if (kale.snapshotLength > 0) {
//         const codeFileLink = kale.snapshotItem(0) as HTMLElement;
//         codeFileLink.click();
//       }
//     }
//   } catch (error) {
//     console.log('\x1b[31m\n\n', error, '\x1b[0m');
//     throw error;
//   }

//   // Quiz : Click the slide right button in Quiz and click Check answers buttons at the end.
//   try {
//     // Sometimes slideRight button doesn't vanish so we will check maxTimes in while lopp and break.
//     let maxNextSlideRightButton = 0;

//     // eslint-disable-next-line no-constant-condition
//     while (true) {
//       const slideRightResult = document.evaluate('//button[contains(@class, "styles__SlideRightButton")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       for (let i = 0; i < slideRightResult.snapshotLength; i++) {
//         const slideRightElement = slideRightResult.snapshotItem(i) as HTMLButtonElement;
//         slideRightElement.click();
//       }

//       if (slideRightResult.snapshotLength === 0 || maxNextSlideRightButton === 100) {
//         break;
//       }

//       maxNextSlideRightButton++;
//     }
//   } catch (error) {
//     console.log('\x1b[31m', error, '\x1b[0m');
//     throw error;
//   }

//   // Check Answers in Quiz
//   try {
//     const buttonTextXpath = document.evaluate('//button[span[text()="Check Answers"]]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//     for (let i = 0; i < buttonTextXpath.snapshotLength; i++) {
//       const buttonTextXpathElement = buttonTextXpath.snapshotItem(i) as HTMLElement;
//       buttonTextXpathElement.click();
//     }
//   } catch (error) {
//     console.log('\x1b[31m', error, '\x1b[0m');
//     throw error;
//   }
// }

/**
 * Save page as PDF.
 */
// async function savePageAsPDF(page: Page, path: string): Promise<void> {
//   await page.emulateMediaType('screen');
//   await page.pdf({
//     path: path + '.pdf',
//     printBackground: true,
//     format: 'A4',
//     margin: { top: 0, right: 0, bottom: 0, left: 0 }
//   });
// }

/**
 * Save page as MHTML.
 */
// async function savePageAsMHTML(page: Page, path: string): Promise<void> {
//   const cdp = await page.target().createCDPSession();
//   const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
//   await writeFile(path + '.mhtml', data);
// }

/**
 * Check if a lesson is already downloaded.
 */
// async function isAlreadyDownloaded(normalizedTitle: string, language?: string) {
//   let path = SAVE_DESTINATION;

//   if (language) {
//     path += `/${language}`;
//   }

//   if (SAVE_AS === SaveAs.PDF) {
//     path += `/${normalizedTitle}.pdf`;
//   } else {
//     path += `/${normalizedTitle}.mhtml`;
//   }

//   return (await isExists(path));
// }
