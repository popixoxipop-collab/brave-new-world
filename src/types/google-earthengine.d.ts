declare module "@google/earthengine" {
  const ee: {
    initialize: (...args: unknown[]) => Promise<void>;
    [key: string]: unknown;
  };
  export default ee;
}
