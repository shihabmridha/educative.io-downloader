import { ChromeBrowser } from './browser';
import { Configuration } from './configuration';

export class Authentication {
  private _browser: ChromeBrowser;
  private _config: Configuration;

  constructor(config: Configuration, browser: ChromeBrowser) {
    this._browser = browser;
    this._config = config;
  }

  async authenticate() {
    if (this._config.userConfig.skipLogin) {
      console.log('Skipping login');
      return;
    }

    const alreadyLoggedIn = await this.isLoggedIn();
    if (alreadyLoggedIn) {
      console.log('Already logged in');
      return;
    }

    await this.login();
  }

  async isLoggedIn(): Promise<boolean> {
    console.log('Checking if already logged in');
    const baseUrl = this._config.baseUrl;

    await this._browser.get();

    const tab = await this._browser.getTab();

    await tab.goTo({ url: baseUrl, waitUntil: 'networkidle2' });

    if (tab.url === `${baseUrl}/learn/home`) {
      return true;
    }

    return false;
  }

  async login(): Promise<void> {
    const baseUrl = this._config.baseUrl;
    const { email, password } = this._config.userConfig;

    console.log('Loggin in.');
    const EMAIL: string = email;
    const PASSWORD: string = password;

    console.log(`Email: ${EMAIL}, Password: ${PASSWORD}`);

    // Close any open browser
    await this._browser.close();

    // Open non-headless browser to input OTP during login
    await this._browser.get(false);

    const tab = await this._browser.getTab();
    // await page.setUserAgent(USER_AGENT);
    await tab.goTo({ url: `${baseUrl}/login`, waitUntil: 'networkidle2' });

    if (!tab.url.includes(`${baseUrl}/login`)) {
      console.log('You are already logged in or the login URL has been changed');
      return;
    }

    const page = tab.page;
    await page.type('[name=email]', EMAIL, { delay: 200 });
    await page.type('[name=password]', PASSWORD, { delay: 200 });
    await page.click('button[type="submit"]');

    const response = await page.waitForResponse(`${baseUrl}/api/user/login`);
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

}
