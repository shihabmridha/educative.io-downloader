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
- saveAs: Available options: ___`pdf`, `html`, `image`___. Default is ___`image`___.


**I have created this for my own usage. Managed only a couple of hours to create this tool. You might find a lot of issues. Feel free to create a PR.**
