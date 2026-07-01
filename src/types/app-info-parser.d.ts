declare module "app-info-parser" {
  /**
   * app-info-parser has no published types. It default-exports a class whose
   * `.parse()` resolves to the raw manifest/Info.plist object. We narrow the
   * fields we actually read inside src/lib/parse.ts.
   */
  export default class AppInfoParser {
    constructor(filePath: string | File);
    parse(): Promise<Record<string, unknown>>;
  }
}
