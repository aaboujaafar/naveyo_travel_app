declare module "node:fs/promises" {
  export function copyFile(source: string, destination: string): Promise<void>;
  export function mkdir(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<void>;
  export function readdir(
    path: string,
    options?: { withFileTypes?: boolean },
  ): Promise<{ isDirectory(): boolean; name: string }[]>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function stat(
    path: string,
  ): Promise<{ isFile(): boolean; size: number }>;
  export function unlink(path: string): Promise<void>;
  export function writeFile(
    path: string,
    data: string,
    encoding: string,
  ): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
}

declare module "node:path" {
  export function extname(path: string): string;
  export function join(...segments: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:crypto" {
  export function randomUUID(): string;
}
