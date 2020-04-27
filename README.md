# educative.io downloader

> IMPORTANT: You need a subscription to use this.

This tool is to download course from educative.io for later usage. It uses your login credentials and download the course.

> Might not work in WSL

# Usage
- Install typescript cli.
- Clone the project and navigate into it.
- `npm install` to install dependencies.
- Open ___config/default.json___ file to set configurations. (Email, Password, Course URLs).
- `npm run compile` to compile typescript.
- `npm start` to start download.

# CONFIG
Config file (___config/default.json___) the following properties.
- email: Your subscription email.
- password: Your subscription password.
- loginCheck: If you are already logged in then you can set it to ___false___ to skip login check before downloading a course.
- multiLanguage: Set this to `true` to download code snippet of a lesson in all available language. Default is `false`.
- saveAs: Available options: ___`pdf` and `html`___. Default is ___`html`___.

> IMPORTANT: You you save as html it is actually gonna save as mhtml.


**I have created this for my own usage. You might find a lot of issues. Feel free to create a PR.**
