export {};

declare global {
  interface Window {
    __config: {
      apiUrl: string;
    };
  }
}
