/* eslint-disable camelcase */
import { VercelRequest, VercelResponse } from '@vercel/node';
import Decryptor from '@nypl-simplified-packages/axisnow-access-control-web';
import { validateParam } from '../../../src/utils';
import Epub from '../../../src/Epub';
import RemoteFetcher from '../../../src/RemoteFetcher';

/**
 * This is a handler for Open eBooks Axisnow encrypted EPUBS.
 */
export default async function epubToWebpub(
  req: VercelRequest,
  res: VercelResponse
) {
  const book_vault_uuid = validateParam('vaultId', req.query);
  const isbn = validateParam('isbn', req.query);
  try {
    const decryptor = await Decryptor?.createDecryptor({
      book_vault_uuid,
      isbn,
    });
    const containerXmlHref = decryptor?.containerUrl;
    const fetcher = new RemoteFetcher(containerXmlHref, decryptor);
    const epub = await Epub.build(containerXmlHref, fetcher, decryptor);
    const manifest = epub.webpubManifest;
    res.status(200).json(manifest);
  } catch (e: unknown) {
    if (e instanceof Error) {
      res.status(500).json({
        title: 'Epub Conversion Failure',
        detail: e.message,
        status: 500,
      });
    }
    res.status(500).json({
      title: 'Epub Conversion Failure',
      detail: 'Unknown Error',
      status: 500,
    });
  }
}
