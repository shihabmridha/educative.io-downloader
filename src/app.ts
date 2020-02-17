import { launch, Browser, Overrides } from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as util from 'util';
import * as config from 'config';

const access = util.promisify(fs.access);
const mkdir = util.promisify(fs.mkdir);

const COURSE_URLS: string[] = config.get('courseUrls');
const EMAIL: string = config.get('email');
const PASSWORD: string = config.get('password');

const ROOT_PATH = __dirname + '/../../';

let SAVE_DESTINATION = '';

let browser: Browser;

async function main(): Promise<void> {
  if (COURSE_URLS.length < 1) {
    console.log('Set course url first.');
    return;
  }

  if (!browser && (await isDireectoryExists(`${ROOT_PATH}/data`))) {
    browser = await launch({ userDataDir: ROOT_PATH + '/data', headless: true });
  } else {
    browser = await launch({ headless: true });
  }

  /**
   * Cookies etc are stored in ./data directory. If it doesn't exists then user is not logged in.
   */
  if (!(await isDireectoryExists(`${ROOT_PATH}/data`))) {
    await login();
  }

  for (const COURSE_URL of COURSE_URLS) {
    console.log('Download in proguress. Course URL => ' + COURSE_URL);

    const pageLinks = await fetchCourseAndFindPageLinks(COURSE_URL);

    console.log('Total content found: ' + pageLinks.size);

    let i = 1;
    let promises = [];
    for (const key of pageLinks.keys()) {
      try {
        if (i % 5 === 0 || i === pageLinks.size) {
          await Promise.all(promises.map((p) => p.catch((e: Error) => console.log(e.message))));
          promises = [];
        }

        console.log(`Processing => ${key} (${pageLinks.get(key)})`);

        promises.push(downloadPage(`${i}.${key}`, pageLinks.get(key)));

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

async function login(): Promise<void> {
  console.log('Loggin in.');

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    const data: Overrides = {
      method: 'POST',
      postData: `email=${EMAIL}&password=${PASSWORD}`
    };

    interceptedRequest.continue(data);
  });

  await page.goto('https://www.educative.io/api/user/login');

  await page.close();
}

async function fetchCourseAndFindPageLinks(COURSE_URL: string): Promise<Map<string, string>> {
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

  const html = await page.content();
  const $ = cheerio.load(html);
  const links = $('.tab-content a');

  const pageLinks = new Map();

  $(links).each(function (_i, link) {
    pageLinks.set($(link).text(), $(link).attr('href'));
  });

  await page.close();

  return pageLinks;
}

const setTimeoutPromise = util.promisify(setTimeout);

async function downloadPage(title: string, link: string): Promise<void> {
  const normalizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 720 });

  await page.goto('https://www.educative.io' + link, { waitUntil: 'networkidle0' });
  await page.click('#sidebar-hamburger');

  await setTimeoutPromise(300); // Wait for munu to close

  await page.screenshot({ path: `${SAVE_DESTINATION}/${normalizedTitle}.png`, fullPage: true });
  await page.close();
}

/**
 * Run the main function
 */
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
