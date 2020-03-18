import { launch, Browser } from 'puppeteer';
import * as fs from 'fs';
import * as util from 'util';
import * as config from 'config';

const access = util.promisify(fs.access);
const mkdir = util.promisify(fs.mkdir);
const setTimeoutPromise = util.promisify(setTimeout);

const COURSE_URLS: string[] = config.get('courseUrls');
const EMAIL: string = config.get('email');
const PASSWORD: string = config.get('password');
const MAKE_PDF: boolean = config.get('pdf');

const ROOT_PATH = __dirname + '/../../';

let SAVE_DESTINATION = '';

let browser: Browser;

interface PageTitleAndLink {
  title: string;
  link: string;
}

async function main(): Promise<void> {
  if (COURSE_URLS.length < 1) {
    console.log('Set course url first.');
    return;
  }

  browser = await launch({ userDataDir: ROOT_PATH + '/data', headless: true });

  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    await login();
  }

  for (const COURSE_URL of COURSE_URLS) {
    console.log('Download in proguress. Course URL => ' + COURSE_URL);

    const pageLinks: PageTitleAndLink[] = await fetchCourseAndFindPageLinks(COURSE_URL);

    console.log('Total content found: ' + pageLinks.length);

    let i = 1;
    let promises = [];
    let doToggleMenu = true;
    for (const page of pageLinks) {
      try {
        if (i % 5 === 0 || i === pageLinks.length) {
          doToggleMenu = false;
          await Promise.all(promises.map((p) => p.catch((e: Error) => console.log(e.message))));
          promises = [];
        }

        console.log(`Processing => ${page.title} (${page.link})`);

        promises.push(downloadPage(`${i}.${page.title}`, page.link, doToggleMenu));
        i++;
      } catch (error) {
        console.error(error.message);
      }
    }

    // Wait for pending promises to resolve
    await Promise.all(promises);

  }

  await browser.close();
}

async function isDireectoryExists(path: string): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);
  } catch (error) {
    return false;
  }

  return true;
}

async function fetchCourseAndFindPageLinks(COURSE_URL: string): Promise<PageTitleAndLink[]> {
  const page = await browser.newPage();

  await page.goto(COURSE_URL, { waitUntil: 'networkidle0' });
  const title = (await page.title()).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '_');

  // Create downloads folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads`))) {
    await mkdir(`${ROOT_PATH}/downloads`);
  }

  // Create course folder
  if (!(await isDireectoryExists(`${ROOT_PATH}/downloads/${title}`))) {
    await mkdir(`${ROOT_PATH}/downloads/${title}`);
  }

  SAVE_DESTINATION = ROOT_PATH + '/downloads/' + title;

  const pageLinks = await page.evaluate(() => {
    const links: HTMLAnchorElement[] = Array.from(document.querySelectorAll('.tab-content a'));
    return links.map((link) => {
      return {
        title: link.innerText,
        link: link.href
      };
    });
  });

  await page.close();

  return pageLinks;
}

async function downloadPage(title: string, link: string, doToggleMenu: boolean): Promise<void> {
  const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 580 });

  await page.goto(link, { waitUntil: 'networkidle0' });

  await page.addStyleTag({ content: 'div[class^="styles__PrevNextButtonWidgetStyled"], div[class^="styles__Footer"], .summary { display: none !important; }' });

  if (MAKE_PDF) {
    await page.emulateMediaType('screen');
    await page.pdf({
      path: `${SAVE_DESTINATION}/${normalizedTitle}.pdf`,
      printBackground: true,
    });
  } else {
    if (doToggleMenu) {
      await page.click('#sidebar-hamburger');
    }

    await setTimeoutPromise(300); // Wait for munu to close

    await page.screenshot({ path: `${SAVE_DESTINATION}/${normalizedTitle}.png`, fullPage: true });
    await page.close();
  }
}

async function login(): Promise<void> {
  console.log('Loggin in.');

  const page = await browser.newPage();

  await page.goto('https://www.educative.io', { waitUntil: 'networkidle0' });
  await page.click('.MuiButton-label');
  await page.type('#loginform-email', EMAIL);
  await page.type('#loginform-password', PASSWORD);

  await setTimeoutPromise(2000);

  await page.click('#modal-login');

  const element = await page.waitForSelector("#alert span", { timeout: 5000 });
  const label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);

  if (label && label !== 'Signed in') {
    throw new Error(label);
  }

  await page.close();
}

async function isLoggedIn(): Promise<boolean> {
  const page = await browser.newPage();
  await page.goto('https://www.educative.io', { waitUntil: 'networkidle0' });
  const element = await page.$('.MuiButton-outlined');
  let label;
  if (element) {
    label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);
  }

  await page.close();

  return label !== 'Log in';
}

/**
 * Run the main function
 */
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
