import * as config from 'config';
import { getBrowser } from './browser';
import { downloadPage, fetchLessonUrls } from './download';
import { PageTitleAndLink, BATCH_SIZE } from './globals';
import { isLoggedIn, login } from './login';

const COURSE_URL: string = config.get('courseUrl');
const LOGIN_CHECK: boolean = config.get('loginCheck');

async function main(): Promise<void> {
  if (!COURSE_URL) {
    throw new Error('Set course url first.');
  }

  console.log(`CHECK IF ALREADY LOGGEDIN: ${LOGIN_CHECK}`);

  if (LOGIN_CHECK) {
    const loggedIn = await isLoggedIn();

    if (!loggedIn) {
      await login();
    } else {
      console.log('Already logged in');
    }
  }

  const pageLinks: PageTitleAndLink[] = await fetchLessonUrls(COURSE_URL);

  let pageNumber = 1;
  while (pageLinks.length) {
    try {
      await Promise.all(pageLinks.splice(0, BATCH_SIZE).map((page) => {
        return downloadPage(`${pageNumber++}.${page.title}`, page.link);
      }));
    } catch (error) {
      console.error(error.message);
    }
  }

  (await getBrowser()).close();

  console.log('=> Done');
}

/**
 * Handle unhandled promise rejection
 */
process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Handle uncaught exception
 */
process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Run the main function
 */
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
