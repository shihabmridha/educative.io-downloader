import * as config from 'config';
import { HTTP_REQUEST_TIMEOUT, USER_AGENT } from './globals';
import { getPage, getBrowser } from './browser';

const EMAIL: string = config.get('email');
const PASSWORD: string = config.get('password');

console.log(`EMAIL: ${EMAIL}, PASSWORD: ${PASSWORD}`);

export async function isLoggedIn(): Promise<boolean> {

  console.log('Checking if already logged in');

  /**
   * At this point we should not have any browser open yet.
   * So, open a new non-special browser.
   */
  await getBrowser();

  const page = await getPage();

  await page.goto('https://www.educative.io', { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });

  if (page.url() === 'https://www.educative.io/learn') {
    return true;
  }

  return false;
}

export async function login(): Promise<void> {
  console.log('Loggin in');

  const page = await getPage();
  await page.setUserAgent(USER_AGENT);
  await page.goto('https://www.educative.io', { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });

  const isLoginButtonClicked = await page.evaluate(() => {
    const elements = document.getElementsByClassName('MuiButton-label');

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].innerHTML === 'Log in') {
        (elements[i] as HTMLElement).click();
        return true;
      }
    }

    return false;
  });

  if (!isLoginButtonClicked) {
    throw new Error('Could not find login button');
  }

  // Wait for dom to load
  await page.waitFor(5000);

  await page.type('#loginform-email', EMAIL);
  await page.type('#loginform-password', PASSWORD);

  await page.waitFor(2000);

  await page.click('#modal-login');

  const element = await page.waitForSelector("#alert span", { timeout: 10000 });
  const label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);

  if (label && label !== 'Signed in') {
    throw new Error(label);
  }

  await page.close();
}
