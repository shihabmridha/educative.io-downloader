import * as config from 'config';
import { isDireectoryExists, mkdir, writeFile, isFileExists } from './helpers';
import { ROOT_PATH, HTTP_REQUEST_TIMEOUT, PageTitleAndLink, SAVE_LESSON_AS } from './globals';
import { getPage, getSpecialBrowser } from './browser';
import { Browser, Page } from 'puppeteer';

let SAVE_DESTINATION = '';
const SAVE_AS: string = config.get('saveAs');
const MULTI_LANGUAGE: boolean = config.get('multiLanguage');

const IS_DIRECTORY_CREATED = {};

console.log(`SAVE AS: ${SAVE_AS}`);

export async function fetchLessonUrls(courseUrl: string): Promise<PageTitleAndLink[]> {

  console.log(`Navigating to courses page. URL: ${courseUrl}`);

  // This function close non-special browsre (if open) and open special browser
  await getSpecialBrowser();

  const page = await getPage();

  await page.goto(courseUrl, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle0' });
  const title = (await page.title()).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '_');

  // Create downloads folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads`))) {
    await mkdir(`${ROOT_PATH}/downloads`);
  }

  console.log(`Creating course directory`);

  // Create course folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads/${title}`))) {
    await mkdir(`${ROOT_PATH}/downloads/${title}`);
  }

  SAVE_DESTINATION = ROOT_PATH + '/downloads/' + title;

  console.log(`Looking for lessons\'s urls`);

  const pageLinks = await page.evaluate(() => {
    const links: HTMLAnchorElement[] = Array.from(document.querySelectorAll('.tab-content a'));
    return links.map((link) => {
      return {
        title: link.innerText,
        link: link.href
      };
    });
  });

  console.log(`Total lessons: ${pageLinks.length}`);
  // await page.close();

  return pageLinks;
}

export async function downloadPage(title: string, link: string): Promise<void> {
  let browser: Browser;
  let page: Page;

  try {
    const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

    if (!MULTI_LANGUAGE && (await isAlreadyDownloaded(normalizedTitle))) {
      return;
    }

    console.log(`Downloading => ${title} - (${link})`);

    browser = await getSpecialBrowser();
    page = await browser.newPage();

    await page.goto(link, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle0' });

    await page.addStyleTag({ content: 'div[class^="styles__PrevNextButtonWidgetStyled"], div[class^="styles__Footer"], nav { display: none !important; }' });

    const languages = await page.evaluate(({ SAVE_AS, SAVE_LESSON_AS }) => {
      // Expand all slides in the page
      const xPathResult = document.evaluate('//button[contains(@class, "AnimationPlus")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < xPathResult.snapshotLength; i++) {
        const element = xPathResult.snapshotItem(i) as HTMLElement;
        element.click();
      }

      // Remove top & left space
      const node = document.getElementById('view-collection-article-content-root');
      if (SAVE_AS === SAVE_LESSON_AS.PDF) {
        node?.childNodes[0]?.childNodes[0]?.childNodes[0]?.remove();
      } else {
        node.style.cssText = 'margin-top: -70px';

        const content = node?.childNodes[0]?.childNodes[0]?.childNodes[1]?.childNodes[0]?.childNodes[0];
        node?.childNodes[0]?.childNodes[0]?.childNodes[1]?.appendChild(content);
        node?.childNodes[0]?.childNodes[0]?.childNodes[0]?.remove();
      }

      // Fetch available language of code snippets
      const languages = [];
      const codeContainer = document.getElementsByClassName('code-container');
      if (codeContainer.length === 0) {
        return languages;
      }

      const targetNode = codeContainer[0].previousSibling;
      if (targetNode?.firstChild) {
        const languageTabs = (targetNode.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
        languageTabs.forEach((e) => {
          languages.push(e.querySelector('span').innerText);
        });
      }

      return languages;
    }, { SAVE_AS, SAVE_LESSON_AS });

    /**
     * If lesson has multiple language and user set multiLanguage to true then download all language.
     */
    if (languages.length > 1 && MULTI_LANGUAGE) {
      console.log(`Availabl languages for this lessons: ${languages.toString()}`);

      for (const language of languages) {
        if (!IS_DIRECTORY_CREATED[language] && !(await isDireectoryExists(`${SAVE_DESTINATION}/${language}`))) {
          // Create language dir
          await mkdir(`${SAVE_DESTINATION}/${language}`);

          IS_DIRECTORY_CREATED[language] = true;
        }

        if ((await isAlreadyDownloaded(normalizedTitle, language))) {
          console.log(`Already downloaded ${title} (${language})`);
          continue;
        }

        const path = `${SAVE_DESTINATION}/${language}/${normalizedTitle}`;

        await page.evaluate((language) => {
          const languageTabs = (document.getElementsByClassName('code-container')[0]?.previousSibling?.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
          languageTabs.forEach((e) => {
            if (e.querySelector('span').innerText === language) {
              e.querySelector('span').click();
            }
          });
        }, language);

        // waiting 1 seconds just to be sure language has been changed
        await page.waitFor(1000);

        if (SAVE_AS === SAVE_LESSON_AS.PDF) {
          await savePageAsPDF(page, path);
        } else {
          await savePageAsMHTML(page, path);
        }
      }
    } else {
      const path = `${SAVE_DESTINATION}/${normalizedTitle}`;
      if (SAVE_AS === SAVE_LESSON_AS.PDF) {
        await savePageAsPDF(page, path);
      } else {
        await savePageAsMHTML(page, path);
      }
    }
  } catch (error) {
    console.log('Failed to download ', link);
    console.log('Reason:', error.message);
  }

  if (page) {
    await page.close();
  }
}

async function savePageAsPDF(page: Page, path: string): Promise<void> {
  await page.emulateMediaType('screen');
  await page.pdf({
    path: path + '.pdf',
    printBackground: true,
    format: 'A4',
    margin: { top: 0, right: 0, bottom: 0, left: 0, }
  });
}

async function savePageAsMHTML(page: Page, path: string): Promise<void> {
  const cdp = await page.target().createCDPSession();
  const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' }) as any;
  await writeFile(path + '.mhtml', data);
}

async function isAlreadyDownloaded(normalizedTitle: string, language?: string) {
  let path = SAVE_DESTINATION;

  if (language) {
    path += `/${language}`;
  }

  if (SAVE_AS === SAVE_LESSON_AS.PDF) {
    path += `/${normalizedTitle}.pdf`;
  } else {
    path += `/${normalizedTitle}.mhtml`;
  }

  return (await isFileExists(path));
}
