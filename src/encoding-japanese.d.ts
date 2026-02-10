declare module 'encoding-japanese' {
  type EncodingName = 'UNICODE' | 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'ASCII' | 'AUTO'

  interface ConvertOptions {
    to: EncodingName
    from?: EncodingName
  }

  export function stringToCode(str: string): number[]
  export function codeToString(code: number[]): string
  export function convert(data: number[] | Uint8Array, options: ConvertOptions): number[]
  export function detect(data: number[] | Uint8Array): EncodingName | false
}
