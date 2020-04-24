import * as config from 'config';
import { setSpinnerText } from './spinner';
import { isDireectoryExists, mkdir, writeFile } from './helpers';
import { ROOT_PATH, HTTP_REQUEST_TIMEOUT, PageTitleAndLink, SAVE_LESSON_AS } from './globals';
import { getPage, getSpecialBrowser } from './browser';

let SAVE_DESTINATION = '';
const SAVE_AS: string = config.get('saveAs');

console.log(`SAVE AS: ${SAVE_AS}`);

export async function fetchLessonUrls(courseUrl: string): Promise<PageTitleAndLink[]> {

  setSpinnerText(`Navigating to courses page. URL: ${courseUrl}`);

  // This function close non-special browsre (if open) and open special browser
  await getSpecialBrowser();

  const page = await getPage();

  await page.goto(courseUrl, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle0' });
  const title = (await page.title()).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '_');

  // Create downloads folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads`))) {
    await mkdir(`${ROOT_PATH}/downloads`);
  }

  setSpinnerText(`Creating course directory`);

  // Create course folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads/${title}`))) {
    await mkdir(`${ROOT_PATH}/downloads/${title}`);
  }

  SAVE_DESTINATION = ROOT_PATH + '/downloads/' + title;

  setSpinnerText(`Looking for lessons\'s urls`);

  const pageLinks = await page.evaluate(() => {
    const links: HTMLAnchorElement[] = Array.from(document.querySelectorAll('.tab-content a'));
    return links.map((link) => {
      return {
        title: link.innerText,
        link: link.href
      };
    });
  });

  // await page.close();

  return pageLinks;
}

export async function downloadPage(title: string, link: string): Promise<void> {
  const browser = await getSpecialBrowser();
  const page = await browser.newPage();

  try {
    const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

    await page.goto(link, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle0' });

    await page.addStyleTag({ content: 'div[class^="styles__PrevNextButtonWidgetStyled"], div[class^="styles__Footer"], nav { display: none !important; }' });

    await page.evaluate(({ SAVE_AS, SAVE_LESSON_AS }) => {
      // Expant all slides in the page
      const xPathResult = document.evaluate('//button[contains(@class, "AnimationPlus")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < xPathResult.snapshotLength; i++) {
        const element = xPathResult.snapshotItem(i) as HTMLElement;
        element.click();
      }

      const node = document.getElementById('view-collection-article-content-root');
      if (SAVE_AS === SAVE_LESSON_AS.PDF) {
        node.childNodes[0].childNodes[0].childNodes[0].remove();
      } else {
        node.style.cssText = 'margin-top: -70px';

        const content = node.childNodes[0].childNodes[0].childNodes[1].childNodes[0].childNodes[0];
        node.childNodes[0].childNodes[0].childNodes[1].appendChild(content);
        node.childNodes[0].childNodes[0].childNodes[0].remove();
      }
    }, { SAVE_AS, SAVE_LESSON_AS });

    if (SAVE_AS === SAVE_LESSON_AS.PDF) {
      await page.emulateMediaType('screen');
      await page.pdf({
        path: `${SAVE_DESTINATION}/${normalizedTitle}.pdf`,
        printBackground: true,
        format: 'A4',
        margin: { top: 0, right: 0, bottom: 0, left: 0, }
      });
    } else {
      const cdp = await page.target().createCDPSession();
      const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' }) as any;
      await writeFile(`${SAVE_DESTINATION}/${normalizedTitle}.mhtml`, data);
    }
  } catch (error) {
    console.log('Failed to save ', link);
    console.log('Reason:', error.message);
  }

  await page.close();
}
