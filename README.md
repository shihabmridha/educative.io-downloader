## ✉️ Description
This tool is to download course from for later usage. It uses your login credentials and download the course.

## 🧯 IMPORTANT
- You need a subscription to use this.
- Might not work in WSL

## 💡 Usage
- Install typescript cli.
- Clone the project and navigate into it.
- `npm install` to install dependencies.
- Open ___config/default.json___ file to set configurations. (Email, Password, Course URL).
- `npm run compile` to compile typescript.
- `npm start` to start download.

> IMPORTANT: If you make changes to the code, make sure to compile it.

## ⚙️ CONFIG
Config file (___config/default.json___) has the following properties.
- email: Your subscription email.
- password: Your subscription password.
- loginCheck: By default, before downloading a course we check if you are already logged in. If you are sure that you are already logged in then you can set this value to ___false___ to skip login check. Recommended value: `true`.
- multiLanguage: A lesson can contains code snippets in multiple programming languages. Set this to `true` to download snippets in all available language. Default is `false`.
- saveAs: Available options: ___`pdf` and `html`___. Default is ___`html`___.
- headless: Browser mode. Default is `false`.

> IMPORTANT: If you save as html it is actually gonna save as mhtml.


## 🛠 TROUBLESHOOT

**NAVIGATION TIMEOUT (Or, some other timeout)?**
- Open globals.ts and increase the value of `HTTP_REQUEST_TIMEOUT`. Default is 30000ms.

**DOWNLOAD EMPTY PAGE?**
- Verify your login credentials and set `loginCheck: true`.
- Open ___browser.ts___ file and find `launchBrowser()` and set ` headless: false` to see live actions.
- Make sure you are logged in.

**FORCE LOGIN? LOGIN TO ANOTHER ACCOUNT?**
- Remove `data` directory. Chrome driver stores session/cookies etc in that directory.

**SOMETHING IS WRONG?**
- Remove `data` directory. Chrome driver stores session/cookies etc in that directory.
