import { launch, Browser, Page, LaunchOptions } from 'puppeteer';
import { ROOT_PATH } from './globals';

let browser: Browser;
let isSpecialBrowser = false;

async function launchBrowser(args?: LaunchOptions) {
  let configuration = {
    userDataDir: ROOT_PATH + '/data',
    headless: true,
    args: ['--no-sandbox']
  };

  if (args) {
    configuration = {
      ...configuration,
      args: [
        ...configuration.args,
        ...args.args
      ]
    };
  }

  browser = await launch(configuration);
}

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    await launchBrowser();
  }

  return browser;
}

export async function getSpecialBrowser(): Promise<Browser> {
  const specialArgs = {
    defaultViewport: null,
    args: ['--window-size=1920,0']
  };

  if(isSpecialBrowser) {
    return browser;
  }

  // If a browser is open but not special then close it
  if (browser) {
    await browser.close();
    browser = undefined;
  }

  if (!browser) {
    await launchBrowser(specialArgs);
  }

  isSpecialBrowser = true;

  return browser;
}

export async function getPage(): Promise<Page> {
  if (!browser) {
    throw new Error('No browser initialted yet');
  }

  let [page] = await browser.pages();
  if (!page) {
    page = await browser.newPage();
  }

  return page;
}
