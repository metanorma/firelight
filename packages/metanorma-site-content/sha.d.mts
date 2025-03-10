export function sha256 (data?: any): {
  add: (data: any) => void;
  digest: () => Uint8Array & { hex: () => string };
}
