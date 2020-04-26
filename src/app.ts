import * as config from 'config';
import { isLoggedIn, login } from './login';
import { fetchLessonUrls, downloadPage, createLanguageDirectories } from './download';
import { HTTP_REQUEST_TIMEOUT, PageTitleAndLink } from './globals';
import { getBrowser, getPage } from './browser';
import * as inquirer  from  'inquirer';

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
      console.log('Already logged in');
    }
  }

  // Ask user if they want to download all the languages available
  const userInput = await inquirer.prompt([ 
    {
      type: 'confirm',
      name: 'shouldDownloadAllLanguages',
      message: 'Do you want to download course with all the languages avaialable? \n'
    }
  ]);

  if(userInput.shouldDownloadAllLanguages) {

    // Ask user to enter page url where they encounter the code block
    const userInput = await inquirer.prompt([
      {
        name: 'pageWithCodeBlockUrl',
        message: 'Enter the Page URL where you encountered the code block.\n' + 
        'Important :- Page URL should be from same course provided in config file.\n'
      },
     ]);

    const pageWithCodeBlockUrl = (userInput.pageWithCodeBlockUrl as string).trim();

    if(!pageWithCodeBlockUrl) {
      throw new SilentError('Invalid Input! -> Page URL cannot be blank.\nExitting process now...');
    } else if(pageWithCodeBlockUrl === COURSE_URL) {
      throw new SilentError('Invalid Input! -> Page URL & Course URL cannot be same.\nExitting process now...');
    } else if(!isValidURL(pageWithCodeBlockUrl)) {
      throw new SilentError('Invalid Input! -> Page URL should be from same course provided in config file.\nExitting process now...');
    } else {
      
      const pageTitlesAndLinks = await getPageTitleAndLink()

      console.log('Navigating to Page URL to get number of Languages Available')
      const page = await getPage();
      await page.goto(pageWithCodeBlockUrl, { timeout: HTTP_REQUEST_TIMEOUT, waitUntil: 'networkidle0' });

      //find out number of languages available in this course
      const languagesAvailable = await page.evaluate(() => {
        let languages = [];
        const codeContainer = document.getElementsByClassName('code-container')
        if(codeContainer.length === 0) {
          return  languages;
        }
        const languageTabs = (codeContainer[0].previousSibling.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
        for(let i = 0; i < languageTabs.length; i++) {
            languages.push(languageTabs[i].querySelector('span').innerText);
        }
        return languages;
      });

      if(languagesAvailable.length > 0) {
        console.log(`Number of Language Available  => ${languagesAvailable.length}`);

        //create directories for languages available
        await createLanguageDirectories(languagesAvailable);
  
        //click on every language tab and download it's pages
        for(let i = 0; i < languagesAvailable.length; i++) {
          await page.evaluate((index) => {
            const languageTabs = (document.getElementsByClassName('code-container')[0].previousSibling.firstChild as HTMLElement).querySelectorAll('span.desktop-only');
            languageTabs[index].querySelector('span').click();
          }, i);
  
          //waiting 3 seconds just to be sure language has been changed
          await page.waitFor(3000);
  
          console.log(`Downloading ${languagesAvailable[i]} pages...`);
          await downloadCourse(pageTitlesAndLinks, languagesAvailable[i]);
        }
        await page.close();
      } else {
        console.log('No languages found. Downloading without it.')
        await downloadCourse(pageTitlesAndLinks);
      }
    }
  } else {
    await downloadCourse(await getPageTitleAndLink());
  }

  (await getBrowser()).close();

  console.log('=> Done');
}

async function getPageTitleAndLink()  {
  return await fetchLessonUrls(COURSE_URL);
}

async function downloadCourse(pageLinks: PageTitleAndLink[], language: string = ''): Promise<void>{
  let i = 1;
  let promises = [];
  for (const page of pageLinks) {
    try {
      if (i % 5 === 0 || i === pageLinks.length) {
        await Promise.all(promises.map((p) => p));
        promises = [];
      }

      promises.push(downloadPage(`${i}.${page.title}`, page.link, language));
      i++;
    } catch (error) {
      console.error(error.message);
    }
  }

  // Wait for pending promises to resolve
  await Promise.all(promises);
}

function isValidURL(url : string)  {
  return url.includes(COURSE_URL)
}

/**
 * Run the main function
 */
main().catch((e) => {
  console.error(e.message);
  if(e instanceof SilentError) {
    process.exit(0);
  }
  process.exit(1);
});

//Custom Error to exit node process without showing error
class SilentError extends Error {
  constructor (messgae: string) {
    super(messgae);    
  }
}
