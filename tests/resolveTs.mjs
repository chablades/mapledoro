// Lets the tests import app modules whose own imports leave off the ".ts" extension, the way
// the Next.js bundler allows: an extensionless relative import that Node can't find is retried
// with ".ts", then as a folder's index.ts.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(`${specifier}/index.ts`, context);
    }
  }
}
