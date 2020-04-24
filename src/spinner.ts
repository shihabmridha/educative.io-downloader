import * as ora from 'ora';

const spinner = ora('Initiating process\n').start();

export function setSpinnerText(text: string) {
  spinner.text = text + '\n';
}

export function stopSpinner() {
  spinner.stop();
}
