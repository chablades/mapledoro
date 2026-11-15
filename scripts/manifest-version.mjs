// The game version the manifest generators read. On a patch, bump this together with the version
// line in the root CLAUDE.md; every generator that imports it then reads the new manifests.
export const MANIFEST_VERSION = "v272";

/** Repo-relative path to one of the current version's manifest files. */
export const manifestFile = (name) => `manifests/${MANIFEST_VERSION}/${name}`;
