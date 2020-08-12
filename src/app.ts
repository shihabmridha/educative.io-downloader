import * as config from 'config';
import { isLoggedIn, login } from './login';
import { fetchAllCoursesAvailableToDownload, downloadCourse } from './download';
import { ALL_COURSES_API, COURSE_URL_PREFIX } from './globals';
import { getBrowser, closeBrowser } from './browser';

const COURSE_URL: string = config.get('courseUrl');
const LOGIN_CHECK: boolean = config.get('loginCheck');
const DOWNLOAD_ALL_COURSES: boolean = config.get('downloadAllCourses');

async function main(): Promise<void> {

  if (!DOWNLOAD_ALL_COURSES && !COURSE_URL) {
    console.log('Either set courseUrl or make downloadAllCourses true in config file.\nExitting now...');
    return;
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

  if (DOWNLOAD_ALL_COURSES) {
    console.log('Getting all the available courses to download...');

    const courseUrlSlugList = await fetchAllCoursesAvailableToDownload(ALL_COURSES_API);

    if (courseUrlSlugList.length < 1) {
      console.log('No Courses Available to download.');
      (await getBrowser()).close();
      return;
    }

    console.log(`Found a total of ${courseUrlSlugList.length} courses to download.`);

    console.log(`Downloading all the available courses now.`);

    for (const courseUrlSlug of courseUrlSlugList) {
      await downloadCourse(COURSE_URL_PREFIX + courseUrlSlug);
    }
  } else {
    await downloadCourse(COURSE_URL);
  }
}

/**
 * Handle unhandled promise rejection
 */
process.on('unhandledRejection', async (error) => {
  console.error(error);

  // Close browser
  await closeBrowser();

  process.exit(1);
});

/**
 * Handle uncaught exception
 */
process.on('uncaughtException', async (error) => {
  console.error(error);

  // Close browser
  await closeBrowser();

  process.exit(1);
});

/**
 * Run the main function
 */
main()
.then(async () => {
  console.log('=> Done');
  await closeBrowser();
})
.catch(async (e) => {
  console.error(e.message);

  // Close browser
  await closeBrowser();

  process.exit(1);
});
