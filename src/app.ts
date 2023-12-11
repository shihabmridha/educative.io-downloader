import { performLogin } from './login';
import downloader from './download';
import browser from './browser';
import config from './configuration';

async function main(): Promise<void> {
  await performLogin();

  await downloader.downloadCourse(config.userConfig.courseUrl);
  // if (config.userConfig.downloadAll) {
  //   console.log('Getting all the available courses to download...');


    // const allCourseApiUrl = config.apiUrl + '/api/reader/featured';
    // const courseUrlSlugList = await getDownloadableCourses(allCourseApiUrl);

  //   if (courseUrlSlugList.length < 1) {
  //     console.log('No Courses Available to download.');
  //     (await browser.get()).close();
  //     return;
  //   }

  //   console.log(`Found a total of ${courseUrlSlugList.length} courses to download.`);

  //   console.log('Downloading all the available courses now.');

  //   for (const courseUrlSlug of courseUrlSlugList) {
  //     await downloadCourse(`${config.courseUrlPrefix}/${courseUrlSlug}`);
  //   }
  // } else {
  //   await downloadCourse(config.userConfig.courseUrl);
  // }
}

/**
 * Handle unhandled promise rejection
 */
process.on('unhandledRejection', async (error) => {
  console.error(error);
  await browser.close();

  process.exit(1);
});

/**
 * Handle uncaught exception
 */
process.on('uncaughtException', async (error) => {
  console.error(error);
  await browser.close();

  process.exit(1);
});

/**
 * Run the main function
 */
main()
  .then(async () => {
    console.log('=> Done');
    await browser.close();
  })
  .catch(async (e) => {
    console.error(e.message);
    await browser.close();

    process.exit(1);
  });
