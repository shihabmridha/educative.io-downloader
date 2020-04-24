import * as config from 'config';
import { setSpinnerText } from './spinner';
import { setTimeoutPromise } from './helpers';
import { HTTP_REQUEST_TIMEOUT } from './globals';
import { getPage, getBrowser } from './browser';

const EMAIL: string = config.get('email');
const PASSWORD: string = config.get('password');

console.log(`EMAIL: ${EMAIL}, PASSWORD: ${PASSWORD}`);

export async function isLoggedIn(): Promise<boolean> {

  setSpinnerText('Checking if already logged in');

  /**
   * At this point we should not have any browser open yet.
   * So, open a new non-special browser.
   */
  await getBrowser();

  const page = await getPage();

  await page.goto('https://www.educative.io', { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });

  const element = await page.$('.MuiButton-outlined');
  let label: string;
  if (element) {
    label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);
  }

  return label !== 'Log in';
}

export async function login(): Promise<void> {
  setSpinnerText('Loggin in');

  const page = await getPage();
  await page.goto('https://www.educative.io', { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });
  await page.click('.MuiButton-label');
  await page.type('#loginform-email', EMAIL);
  await page.type('#loginform-password', PASSWORD);

  await setTimeoutPromise(2000);

  await page.click('#modal-login');

  const element = await page.waitForSelector("#alert span", { timeout: 10000 });
  const label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);

  if (label && label !== 'Signed in') {
    throw new Error(label);
  }

  await page.close();
}
