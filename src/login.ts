import * as config from 'config';
import { HTTP_REQUEST_TIMEOUT, EDUCATIVE_BASE_URL } from './globals';
import { getPage, getBrowser } from './browser';
import { Page } from 'puppeteer';

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

  await page.goto(EDUCATIVE_BASE_URL, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });

  if (page.url() === `${EDUCATIVE_BASE_URL}/learn`) {
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
  // await page.setUserAgent(USER_AGENT);
  await page.goto(EDUCATIVE_BASE_URL, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle2' });

  const isLoginButtonClicked = await clickButton(page, 'MuiButton-label', 'Log in');

  if (!isLoginButtonClicked) {
    throw new Error('Could not find login button (open login form)');
  }

  // Wait for dom to load
  await page.waitFor(2000);

  await page.type('[name=email]', EMAIL, { delay: 200 });
  await page.type('[name=password]', PASSWORD, { delay: 200 });

  const clickLoginBtn = await clickButton(page, 'MuiButton-label', 'Login');

  if (!clickLoginBtn) {
    throw new Error('Could not find login button (login form submit)');
  }

  const element = await page.waitForSelector(".b-status-control span", { timeout: 10000 });
  let label = await page.evaluate((el: HTMLSpanElement) => el.innerText, element);

  if (label === 'Logging in...') {
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await page.close();
      return;
    } catch (error) {
      console.log('Could not log in');
      label = await page.$eval('.b-status-control span', (node) => node.innerHTML);
    }
  }

  // If script can't find any specific reason then print unknown error
  if (!label) {
    label = 'Unknown error occured';
  }

  throw new Error(label);
}

async function clickButton(page: Page, className: string, buttonLabel: string): Promise<boolean> {
  const isClicked = await page.evaluate(({ className, buttonLabel }) => {
    const elements = document.getElementsByClassName(className);

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].innerHTML === buttonLabel) {
        (elements[i] as HTMLElement).click();
        return true;
      }
    }

    return false;
  }, { className, buttonLabel });

  return isClicked;
}
