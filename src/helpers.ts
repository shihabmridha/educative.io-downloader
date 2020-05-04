import * as fs from 'fs';
import * as util from 'util';

export const access = util.promisify(fs.access);
export const mkdir = util.promisify(fs.mkdir);
export const writeFile = util.promisify(fs.writeFile);

export async function isDireectoryExists(path: string): Promise<boolean> {
  return (await isExists(path));
}

export async function isFileExists(path: string): Promise<boolean> {
  return (await isExists(path));
}

export async function isExists(path: string): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);
  } catch (error) {
    return false;
  }

  return true;
}
