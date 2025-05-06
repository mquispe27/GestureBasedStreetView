declare module "leapjs" {
  export class Controller {
    constructor(options?: { host?: string; port?: number; enableGestures?: boolean });
    connect(): void;
    on(event: string, callback: (frame: any) => void): void;
  }
}
