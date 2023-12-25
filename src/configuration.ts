import { readFileSync } from "fs";
import { UserConfig } from "./types";

export class Configuration {
  private readonly _baseUrl = 'https://www.educative.io';
  private readonly _apiUrl = this._baseUrl + '/api';
  private readonly _courseUrlPrefix = this._baseUrl + '/courses';
  private readonly _batchSize = 1;
  private readonly _httpTimeout = 30000;
  private readonly _userConfig: UserConfig;

  constructor() {
    const data = readFileSync(`${this.rootDir}/config/default.json`, 'utf-8');
    this._userConfig = JSON.parse(data);

    if (!this.userConfig.downloadAll && !this.userConfig.courseUrl) {
      throw new Error('Either set courseUrl or make downloadAllCourses true in config file.\nExitting now...');
    }
  }

  public get rootDir() {
    return process.env.NODE_PATH;
  }

  public get baseUrl() {
    return this._baseUrl;
  }

  public get apiUrl() {
    return this._apiUrl;
  }

  public get courseUrlPrefix() {
    return this._courseUrlPrefix;
  }

  public get userConfig() {
    return this._userConfig;
  }

  /**
   * Number of lessons will download concurrently
   */
  public get batchSize() {
    return this._batchSize;
  }

  /**
   * Request will timeout after this milliseconds.
   */
  public get httpTimeout() {
    return this._httpTimeout;
  }
}
