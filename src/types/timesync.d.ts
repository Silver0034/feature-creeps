declare module 'timesync' {
  export type TimeSync = {
    destroy(): void;
    now(): number;
    on(event: 'change', callback: (offset: number) => void): void;
    on(event: 'error', callback: (err: any) => void): void;
    on(event: 'sync', callback: (value: 'start' | 'end') => void): void;
    off(event: 'change' | 'error' | 'sync', callback?: () => void): void;
    sync(): void;
    send(to: string, data: object, timeout: number): Promise<void>;
    receive(from: string, data: object): void;
  };

  export type TimeSyncCreateOptions = {
    interval?: number;
    delay?: number;
    repeat?: number;
    timeout?: number;
    peers?: string | string[];
    server?: string;
    now?: () => number;
  };

  export function create(options: TimeSyncCreateOptions): TimeSync;
}
