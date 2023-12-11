import config from './configuration';
import browser from './browser';

export async function performLogin() {
  const skipLogin: boolean = config.userConfig.skipLogin;
  if (skipLogin) {
    console.log('Skipping login');
    return;
  }

  const alreadyLoggedIn = await isLoggedIn();
  if (alreadyLoggedIn) {
    console.log('Already logged in');
    return;
  }

  await login();
}

export async function isLoggedIn(): Promise<boolean> {
  console.log('Checking if already logged in');

  /**
   * At this point we should not have any browser open yet.
   * So, open a new non-special browser.
   */
  await browser.get();

  const tab = await browser.getTab();

  await tab.goTo({ url: config.baseUrl, waitUntil: 'networkidle2' });

  if (tab.url === `${config.baseUrl}/learn/home`) {
    return true;
  }

  return false;
}

/**
 * Login a user using given credentials.
 */
export async function login(): Promise<void> {
  console.log('Loggin in.');
  const EMAIL: string = config.userConfig.email;
  const PASSWORD: string = config.userConfig.password;

  console.log(`Email: ${EMAIL}, Password: ${PASSWORD}`);

  // Close any open browser
  await browser.close();

  // Open non-headless browser to input OTP during login
  await browser.get(false);

  const tab = await browser.getTab();
  // await page.setUserAgent(USER_AGENT);
  await tab.goTo({ url: `${config.baseUrl}/login`, waitUntil: 'networkidle2' });

  if (!tab.url.includes(`${config.baseUrl}/login`)) {
    console.log('You are already logged in or the login URL has been changed');
    return;
  }

  const page = tab.page;
  await page.type('[name=email]', EMAIL, { delay: 200 });
  await page.type('[name=password]', PASSWORD, { delay: 200 });
  await page.click('button[type="submit"]');

  const response = await page.waitForResponse(`${config.baseUrl}/api/user/login`);
  if ((response.status() === 403)) {
    const body = await response.json();
    const require2fa = (body.errorText as string).includes('two-factor');

    if (require2fa) {
      await page.waitForFunction(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const otp = document.querySelector('input[name=two_factor_code]') as HTMLInputElement;
        return otp.value.length === 6;
      });

      await page.click('button[type="submit"]');
    }
  }

  await page.waitForFunction(() => {
    const elements = document.getElementsByTagName('span');
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.innerHTML === 'Signed in') {
        return true;
      }
    }

    return false;
  });
}
