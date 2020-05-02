import * as config from 'config';
import { HTTP_REQUEST_TIMEOUT, USER_AGENT } from './globals';
import { getPage, getBrowser } from './browser';

const EMAIL: string = config.get('email');
const PASSWORD: string = config.get('password');

console.log(`EMAIL: ${EMAIL}, PASSWORD: ${PASSWORD}`);

/**
 * Check if user is already logged in.
 * If a user is logged in then going to the root domain would redirect to `/learn` route.
 *
 * @returns Promise which resolves to true if user is logged in otherwise false
 */
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

/**
 * Login a user using given credentials.
 *
 * This function is dependant on the previous step where we check if the user is already logged in.
 * Because, we do not create new browser in this step. So, calling `getPage()` wouldn't throw an error.
 *
 * Set user agent to something else so that server can't easily block request sent by headless browser.
 *
 * Find all the elements containing class name `MuiButton-label`. Then, iterate over them to find the
 * Log in button and click on it to open login form. Then wait for 5 seconds to load the DOM and recaptcha
 * initiation. Then click on the login button in the modal to initiate the login process. Wait for max 10
 * seconds for a span where we will have either and error message or a success message. If the message
 * is `Signed in` then we consider as success otherwise we through an error.
 */
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
  await page.waitFor(2000);

  await page.type('#loginform-email', EMAIL);
  await page.type('#loginform-password', PASSWORD);

  await page.click('#modal-login');

  const element = await page.waitForSelector("#alert span", { timeout: 10000 });
  const label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);

  if (label && label !== 'Signed in') {
    throw new Error(label);
  }

  await page.close();
}
