import { launch, PuppeteerLaunchOptions, Browser, Page } from 'puppeteer';
import config from './configuration';
import { writeFile } from 'node:fs/promises';
import { PageGotoParams, SaveAs } from './types';
import { isExists } from './utils';

export class BrowserTab {
  private readonly _timeout: number = config.httpTimeout;
  private _page: Page;
  private _saveAs: SaveAs;

  constructor(page: Page, saveAs: SaveAs) {
    this._page = page;
    this._saveAs = saveAs;
  }

  private async saveAsPdf(path: string) {
    await this._page.emulateMediaType('screen');
    await this._page.pdf({
      path: `${path}.pdf`,
      printBackground: true,
      format: 'A4',
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
  }

  private async saveAsMhtml(path: string) {
    const cdp = await this._page.target().createCDPSession();
    const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
    await writeFile(`${path}.mhtml`, data);
  }

  async savePage(path: string) {
    const pathWithExtension = this._saveAs === SaveAs.PDF ? `${path}.pdf` : `${path}.mhtml`;
    if ((await isExists(pathWithExtension))) {
      console.log('Page already exists. Path: ' + pathWithExtension);
      return;
    }

    if (this._saveAs === SaveAs.PDF) {
      return this.saveAsPdf(path);
    }

    return this.saveAsMhtml(path);
  }

  async goTo({ url, timeout = this._timeout, waitUntil = 'domcontentloaded' }: PageGotoParams) {
    await this.page.goto(url, { timeout, waitUntil });
  }

  async close() {
    await this._page.close();
  }

  get url() {
    return this._page.url();
  }

  get page() {
    return this._page;
  }
}

export class ChromeBrowser {
  private static _instance: ChromeBrowser;
  private readonly _userDataDir: string;
  private _browser: Browser = null;
  private _isSpecial = false;
  private _isHeadless = true;

  private constructor(rootDir: string, isHeadless: boolean) {
    this._isHeadless = isHeadless;
    this._userDataDir = rootDir + '/data';
  }

  private async launch(headless: boolean, args?: PuppeteerLaunchOptions): Promise<void> {
    this._browser = await launch({
      ...args,
      userDataDir: this._userDataDir,
      headless: headless ? 'new' : false,
      // devtools: true,
    });

    this._isHeadless = headless;
  }

  public static Instance(rootDir: string, isHeadless: boolean) {
    return this._instance || (this._instance = new this(rootDir, isHeadless));
  }

  async get(headless = this._isHeadless): Promise<Browser> {
    if (!this._browser) {
      await this.launch(headless);
    }

    return this._browser;
  }

  async makeSpecial(headless = this._isHeadless) {
    if (this.isSpecial()) {
      return;
    }

    // If a browser is open but not special then close it
    if (this._browser) {
      await this._browser.close();
      this._browser = undefined;
    }

    const specialArgs = {
      defaultViewport: null,
      args: ['--window-size=1920,0']
    };

    if (!this._browser) {
      await this.launch(headless, specialArgs);
    }

    this._isSpecial = true;
  }

  async getTab(): Promise<BrowserTab> {
    if (!this._browser) {
      throw new Error('No browser initialted yet');
    }

    let [page] = await this._browser.pages();
    if (!page) {
      page = await this._browser.newPage();
    }

    const tab = new BrowserTab(page, config.userConfig.saveAs);

    return tab;
  }

  async newTab(): Promise<BrowserTab> {
    const page = await this._browser.newPage();
    const tab = new BrowserTab(page, config.userConfig.saveAs);

    return tab;
  }

  async close(): Promise<void> {
    if (!this._browser) {
      console.log('No browser initialted yet');
      return;
    }

    console.log('Closing browser');

    await this._browser.close();

    this._browser = null;
  }

  isSpecial(): boolean {
    return this._isSpecial;
  }

  isHeadless() {
    return this._isHeadless;
  }
}

export default ChromeBrowser.Instance(config.rootDir, config.userConfig.headless);
