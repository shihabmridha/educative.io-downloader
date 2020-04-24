import * as fs from 'fs';
import * as util from 'util';

export const access = util.promisify(fs.access);
export const mkdir = util.promisify(fs.mkdir);
export const writeFile = util.promisify(fs.writeFile);
export const setTimeoutPromise = util.promisify(setTimeout);

export async function isDireectoryExists(path: string): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);
  } catch (error) {
    return false;
  }

  return true;
}
