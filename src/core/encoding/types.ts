export type CsvEncoding = 'utf-8' | 'shift_jis' | 'euc-jp'

export interface EncodingDetectionResult {
  encoding: CsvEncoding
  confidence: 'high' | 'medium' | 'low'
  hasBom: boolean
}
