# educative.io downloader

> IMPORTANT: You need a subscription to use this.

This tool is to download course from educative.io for later usage. It uses your login credentials and download the course.

> Might now work in WSL

# Usage
- Install typescript cli.
- Clone the project and navigate into it.
- `npm install` to install dependencies.
- Open ___config/default.json___ file to set configurations. (Email, Password, Course URLs).
- `npm run compile` to compile typescript.
- `npm start` to start download.

Default download mode is image. To make pdf, open ___config/default.json___ and set ___pdf: true___.

**I have created this for my own usage. Managed only a couple of hours to create this tool. You might find a lot of issues. Feel free to create a PR.**
