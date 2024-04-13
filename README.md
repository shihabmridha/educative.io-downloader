## [😍 SUPPORT](https://www.educative.io?aff=xkwW)
Help maintaning this project by showing your support. Use **[this affiliate link](https://www.educative.io?aff=xkwW)** for future purchase.

## ✉️ Description
This tool is to download course from for later usage. It uses your login credentials and download the course.

## 🧯 IMPORTANT
- A bunch of things are not working (image does not load sometimes, full code snippet not captured, not multi-language support etc).
- You need a subscription to use this.

# Prerequisite
- Bun (v1.1.0)

## 💡 Usage
- Clone the project and navigate into it.
- `bun install` to install dependencies.
- Create a file named `.env` and set configs (Email, Password, Course URL). See the `.env.example` for reference.
- `bun start` to start download.

## ⚙️ CONFIG
Config file `.env` has the following properties.
- EMAIL: Your subscription email.
- PASSWORD: Your subscription password.
- COURSE_URL: The course you wanna download.
- SKIP_LOGIN: By default, before downloading a course we check if you are already logged in. If you are sure that you are already logged in then you can set this value to ___false___ to skip login check.
- MULTI_LANGUAGE: A lesson can contains code snippets in multiple programming languages. Set this to `true` to download snippets in all available language. Default is `false`.
- SAVE_AS: Available options: ___`pdf` and `html`___. Default is ___`html`___.
- HEADLESS: Browser mode. Default is `false`.
- DOWNLOAD_ALL: Download all available courses for the account

> IMPORTANT: If you save as html it is actually gonna save as mhtml.


## 🛠 TROUBLESHOOT

**NAVIGATION TIMEOUT (Or, some other timeout)?**
- Open configuration.ts and increase the value of `_httpTimeout`. Default is 30000ms.

**DOWNLOAD EMPTY PAGE?**
- Verify your login credentials and set `SKIP_LOGIN = true`.
- Make sure you are logged in.

**FORCE LOGIN? LOGIN TO ANOTHER ACCOUNT?**
- Remove `data` directory. Chrome driver stores session/cookies etc in that directory.

**SOMETHING IS WRONG?**
- Remove `data` directory. Chrome driver stores session/cookies etc in that directory.
