import Decryptor from '@nypl-simplified-packages/axisnow-access-control-web';
import { ImageDimensions } from './types';

export default abstract class Fetcher {
  static readonly CONTAINER_PATH = 'META-INF/container.xml';
  readonly folderPath: string;
  readonly containerXmlPath: string;
  readonly decryptor?: Decryptor;

  constructor(containerXmlPath: string, decryptor?: Decryptor) {
    this.containerXmlPath = containerXmlPath;
    this.decryptor = decryptor;
    const folderPath = containerXmlPath.replace(Fetcher.CONTAINER_PATH, '');
    this.folderPath = folderPath;
  }

  abstract resolvePath(from: string, to: string): string;
  abstract resolveRelativePath(from: string, to: string): string;

  // this differs per fetcher because path.resolve(...) and new URL(...) don't work the same way
  abstract getOpfPath(relativeOpfPath: string): string;

  // the following functions take absolute paths/hrefs
  abstract async getArrayBuffer(path: string): Promise<ArrayBuffer>;
  abstract async getFileStr(path: string): Promise<string>;
  abstract async getImageDimensions(
    path: string
  ): Promise<ImageDimensions | undefined>;
}
