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
