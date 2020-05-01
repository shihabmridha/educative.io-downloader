export enum SAVE_LESSON_AS {
  PDF = 'pdf',
  HTML = 'html'
}

export interface PageTitleAndLink {
  title: string;
  link: string;
}

export const HTTP_REQUEST_TIMEOUT = 30000; // In ms
export const ROOT_PATH = __dirname + '/../../';
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36';
