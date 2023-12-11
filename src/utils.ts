import { access, constants } from 'node:fs/promises';
import { accessSync } from 'node:fs';

export async function isExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
  } catch (error) {
    return false;
  }

  return true;
}

export function isExistsSync(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export async function waitFor(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
