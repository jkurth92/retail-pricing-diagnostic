declare module "node:fs" {
  type DirectoryEntry = {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  };

  type ReadFileSync = {
    (filePath: string): Uint8Array;
    (filePath: string, encoding: "utf8"): string;
  };

  const fs: {
    existsSync(filePath: string): boolean;
    mkdirSync(filePath: string, options?: { recursive?: boolean }): unknown;
    readFileSync: ReadFileSync;
    readdirSync(
      directoryPath: string,
      options: { withFileTypes: true }
    ): DirectoryEntry[];
    writeFileSync(filePath: string, data: string): void;
  };

  export default fs;
}

declare module "node:path" {
  const path: {
    dirname(filePath: string): string;
    join(...paths: string[]): string;
  };

  export default path;
}

declare const process: {
  cwd(): string;
};
