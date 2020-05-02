export enum SAVE_LESSON_AS {
  PDF = 'pdf',
  HTML = 'html'
}

export interface PageTitleAndLink {
  title: string;
  link: string;
}

export const BATCH_SIZE = 5; // Number of lessons will download concurrently
export const HTTP_REQUEST_TIMEOUT = 30000; // Request will timeout after this milliseconds.
export const ROOT_PATH = __dirname + '/../../';
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36';
