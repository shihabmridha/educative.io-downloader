import { PuppeteerLifeCycleEvent } from "puppeteer";

export interface UserConfig {
  email: string;
  password: string;
  skipLogin: boolean;
  saveAs: SaveAs,
  multiLanguage: boolean;
  headless: boolean;
  courseUrl: string;
  downloadAll: boolean;
}

export enum SaveAs {
  PDF = 'pdf',
  HTML = 'html'
}

export interface PageTitleAndLink {
  title: string
  link: string
}

export interface AvailableCourses {
  cursor: string
  summaries: Summary[]
  more: boolean
}

export interface Summary {
  discounted_price: number
  owned_by_reader: boolean
  course_url_slug: string
}

export interface CourseMeta {
  [key: string]: string;
}

export type PageGotoParams = {
  url: string;
  timeout?: number;
  waitUntil?: PuppeteerLifeCycleEvent;
}
