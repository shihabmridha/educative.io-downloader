export enum SAVE_LESSON_AS {
  PDF = 'pdf',
  HTML = 'html'
}

export interface PageTitleAndLink {
  title: string;
  link: string;
}

export interface AvailableCourses {
  cursor: string;
  summaries: Summary[];
  more: boolean;
}

export interface Summary {
  discounted_price: number;
  owned_by_reader: boolean;
  course_url_slug: string;
}

export const HTTP_REQUEST_TIMEOUT = 30000; // In ms
export const ROOT_PATH = __dirname + '/../../';

export const EDUCATIVE_BASE_URL: string = 'https://www.educative.io';
export const ALL_COURSES_API: string = `${EDUCATIVE_BASE_URL}/api/reader/featured/`;
export const COURSE_URL_PREFIX: string = `${EDUCATIVE_BASE_URL}/courses/`;
