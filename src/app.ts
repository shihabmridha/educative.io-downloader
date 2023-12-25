import { Configuration } from './configuration';
import { Authentication } from './login';
import { ChromeBrowser } from './browser';
import { Download } from './download';

class Application {
  private readonly _config: Configuration;
  private readonly _browser: ChromeBrowser;
  private readonly _download: Download;
  private readonly _auth: Authentication;

  public constructor() {
    this._config = new Configuration();
    this._browser = ChromeBrowser.Instance(this._config);

    this._auth = new Authentication(this._config, this._browser);
    this._download = new Download(this._config, this._browser);

    process.on('unhandledRejection', this.uncaughtExceptionHandler);
    process.on('uncaughtException', this.uncaughtExceptionHandler);
  }

  public async run() {
    try {
      await this._auth.authenticate();
      await this._download.course();

      console.log('=> Done');
    } catch (error) {
      console.error(error.message);
    }

    await this._browser.close();
    this.gracefulExit();

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

  private uncaughtExceptionHandler(error: Error) {
    console.error(error);

    this._browser.close()
      .finally(() => {
        this.gracefulExit();
      });
  }

  private gracefulExit() {
    process.exit(1);
  }
}

/**
 * Run the main function
 */
const app = new Application();
app.run();
