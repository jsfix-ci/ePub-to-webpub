import { Metafield } from 'r2-shared-js/dist/es8-es2017/src/parser/epub/opf-metafield';
import Epub from '../Epub';
import { ConformsTo, EpubConformsTo } from '../WebpubManifestTypes/ConformsTo';
import {
  EPUBExtensionMetadata,
  Layout,
} from '../WebpubManifestTypes/EpubExtension';
import { Contributors } from '../WebpubManifestTypes/Metadata';
import { WebpubManifest } from '../WebpubManifestTypes/WebpubManifest';

/**
 * For the purposes of this project, the metadata is not _super_ important since
 * these are not being distributed as webpubs, we just need enough info for our
 * reader to display the book correctly.
 *
 * Missing from metadata:
 * - Language Map support for language-based fields
 * - Subtitle extraction
 * - Publication Direction
 * - ...less important stuff defined in the Metadata type
 */
export function extractMetadata(epub: Epub): WebpubManifest['metadata'] {
  const language = epub.extractMetadataMember('Language');
  const title = extractTitle(epub);
  const contributors = extractContributors(epub);
  const identifier = extractIdentifier(epub);
  const presentation = extractPresentation(epub);
  const conformsTo = getConformsTo();

  return {
    title,
    language: language.length > 1 ? language : language[0],
    identifier,
    ...(presentation && { presentation }),
    conformsTo,
    ...contributors,
  };
}

/**
 * Instead of extracting a map of titles based on language, we will just use
 * the first title we find. This can be extended later to add a
 * map of languages and titles.
 */
function extractTitle(epub: Epub) {
  const titleMeta = epub.extractMetadataMember('Title');
  return titleMeta?.[0].Data ?? 'Uknown Title';
}

/**
 * We will extract a simple list of string contributor names
 * for each contributor role.
 */
function extractContributors(epub: Epub): Contributors {
  const contributorFields = epub.extractMetaField(
    (meta: Metafield) =>
      meta.Property === 'dcterms:creator' ||
      meta.Property === 'dcterms:contributor'
  );

  // Map from EPUB role codes to Webpub Roles
  const roleMap: Record<string, string> = {
    aut: 'author',
    trl: 'translator',
    art: 'artist',
    edt: 'editor',
    ill: 'illustrator',
    ltr: 'letterer',
    pen: 'penciler',
    clr: 'colorist',
    ink: 'inker',
    nrt: 'narrator',
    pbl: 'publisher',
  };

  const contributors = contributorFields.reduce<Contributors>(
    (all, contributor) => {
      const name = contributor.Data;
      // get the role, which is a sibling xml node. The default is contributor
      const epubRole =
        epub.extractMetaField(
          (field) => field.Property === 'role' && field.ID === contributor.ID
        )?.[0]?.Data ?? 'contributor';
      const webpubRole = roleMap[epubRole] ?? 'contributor';
      return {
        ...all,
        [webpubRole]: name,
      };
    },
    {}
  );

  // the author get pre-extracted for some reason from the metafields
  const creators = epub.extractMetadataMember('Creator');
  if (creators.length > 0) {
    if (creators.length > 1) {
      contributors.author = creators.map((creator) => creator.Data);
    } else {
      contributors.author = creators[0].Data;
    }
  }

  return contributors;
}

/**
 * An OPF Package Document can contain many identifiers in its metadata field.
 * However, it also must have a single unique-identifier attribute on the `package`
 * element. This string must be unique to this package document. We will use this.
 *
 * For a spec of OPF <identifier> elements, see:
 *    http://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm#Section2.2.10
 * For a spec of unique-identifier attributes, see:
 *    http://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm#Section2.1
 */
function extractIdentifier(epub: Epub): string | undefined {
  const identifierTagId = epub.opf.UniqueIdentifier;
  const identifiers = epub.opf.Metadata.Identifier;
  const identifier = identifiers?.find((id) => id.ID === identifierTagId);
  return identifier?.Data;
}

/**
 * The Presentation object contains informations about how should the book renders.
 * There are couple of options, but we are only interested in the "layout" for now.
 *
 * Spec with all other avaiable properties, see:
 *    https://readium.org/architecture/streamer/parser/metadata#rendition--presentation
 */
function extractPresentation(
  epub: Epub
): EPUBExtensionMetadata['presentation'] | undefined {
  const presentation: EPUBExtensionMetadata['presentation'] = {};

  const layout = extractLayoutTypeFromMeta(epub);

  if (layout) {
    presentation.layout = extractLayoutTypeFromMeta(epub);
  }

  return presentation;
}

// if rendition:layout has the value 'pre-paginated', return "fixed", otherwise return undefined
// https://readium.org/architecture/streamer/parser/metadata#layout
function extractLayoutTypeFromMeta(epub: Epub): Layout | undefined {
  const metaFields = epub.opf.Metadata.Meta;
  const layoutProperty = metaFields?.find(
    (field) => field.Property === 'rendition:layout'
  );
  return layoutProperty?.Data === 'pre-paginated' ? 'fixed' : undefined;
}

// This package will always be creating webpubs that conform to the EPUB extension
function getConformsTo(): ConformsTo {
  return EpubConformsTo;
}
