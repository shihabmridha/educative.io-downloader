import * as config from 'config';
import { isLoggedIn, login } from './login';
import { fetchLessonUrls, downloadPage } from './download';
import { PageTitleAndLink } from './globals';
import { getBrowser } from './browser';
import { setSpinnerText, stopSpinner } from './spinner';

const COURSE_URL: string = config.get('courseUrl');
const LOGIN_CHECK: boolean = config.get('loginCheck');

async function main(): Promise<void> {
  if (!COURSE_URL) {
    console.log('Set course url first.');
    return;
  }

  console.log(`CHECK IF ALREADY LOGGEDIN: ${LOGIN_CHECK}`);

  if (LOGIN_CHECK) {
    const loggedIn = await isLoggedIn();

    if (!loggedIn) {
      await login();
    } else {
      setSpinnerText('Already logged in');
    }
  }

  const pageLinks: PageTitleAndLink[] = await fetchLessonUrls(COURSE_URL);

  let i = 1;
  let promises = [];
  for (const page of pageLinks) {
    try {
      if (i % 5 === 0 || i === pageLinks.length) {
        setSpinnerText(`Processing batch of lessons.`);
        await Promise.all(promises.map((p) => p));
        promises = [];
      }

      promises.push(downloadPage(`${i}.${page.title}`, page.link));
      i++;
    } catch (error) {
      console.error(error.message);
    }
  }

  // Wait for pending promises to resolve
  await Promise.all(promises);

  (await getBrowser()).close();

  stopSpinner();

  console.log('=> Done');
}

/**
 * Run the main function
 */
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
