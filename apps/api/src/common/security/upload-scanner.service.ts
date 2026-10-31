import { Injectable, BadRequestException } from '@nestjs/common';

export interface FileScanInput {
  filename: string;
  mimetype: string;
  sizeBytes: number;
  buffer: Buffer;
}

export interface ScanResult {
  status: 'CLEAN' | 'INFECTED_QUARANTINED' | 'REJECTED_UNSUPPORTED_TYPE';
  filename: string;
  detectedMime: string;
  fileSizeBytes: number;
  isSafeForStorage: boolean;
  reason?: string;
}

const FORBIDDEN_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.php',
  '.js',
  '.py',
  '.vbs',
  '.dll',
  '.msi',
];

// Known Magic Numbers (Hex headers)
const MAGIC_NUMBERS = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF
};

const EICAR_TEST_STRING = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

@Injectable()
export class UploadScannerService {
  private readonly maxSizeBytes = 10 * 1024 * 1024; // 10MB limit

  public async scanFile(file: FileScanInput): Promise<ScanResult> {
    // 1. File size enforcement
    if (file.sizeBytes > this.maxSizeBytes) {
      return {
        status: 'REJECTED_UNSUPPORTED_TYPE',
        filename: file.filename,
        detectedMime: file.mimetype,
        fileSizeBytes: file.sizeBytes,
        isSafeForStorage: false,
        reason: `File size ${file.sizeBytes} bytes exceeds maximum limit of 10MB.`,
      };
    }

    // 2. Extension check
    const ext = (file.filename.substring(file.filename.lastIndexOf('.')) || '').toLowerCase();
    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      return {
        status: 'REJECTED_UNSUPPORTED_TYPE',
        filename: file.filename,
        detectedMime: 'application/x-executable',
        fileSizeBytes: file.sizeBytes,
        isSafeForStorage: false,
        reason: `Dangerous executable extension '${ext}' is strictly prohibited.`,
      };
    }

    // 3. Magic Bytes / Header Inspection
    const detectedMime = this.inspectMagicBytes(file.buffer);
    if (!detectedMime) {
      return {
        status: 'REJECTED_UNSUPPORTED_TYPE',
        filename: file.filename,
        detectedMime: 'unknown',
        fileSizeBytes: file.sizeBytes,
        isSafeForStorage: false,
        reason:
          'Magic byte signature mismatch. File header does not match permitted image or PDF formats.',
      };
    }

    // 4. Antivirus Scanning Stub (ClamAV mock)
    const fileContentString = file.buffer.toString('utf-8');
    if (fileContentString.includes(EICAR_TEST_STRING)) {
      return {
        status: 'INFECTED_QUARANTINED',
        filename: file.filename,
        detectedMime,
        fileSizeBytes: file.sizeBytes,
        isSafeForStorage: false,
        reason:
          'Malware signature detected (EICAR Antivirus Test Signature). Quarantined immediately.',
      };
    }

    return {
      status: 'CLEAN',
      filename: file.filename,
      detectedMime,
      fileSizeBytes: file.sizeBytes,
      isSafeForStorage: true,
    };
  }

  private inspectMagicBytes(buf: Buffer): string | null {
    if (!buf || buf.length < 4) return null;

    // Check JPEG
    if (
      buf[0] === MAGIC_NUMBERS.JPEG[0] &&
      buf[1] === MAGIC_NUMBERS.JPEG[1] &&
      buf[2] === MAGIC_NUMBERS.JPEG[2]
    ) {
      return 'image/jpeg';
    }

    // Check PNG
    if (
      buf[0] === MAGIC_NUMBERS.PNG[0] &&
      buf[1] === MAGIC_NUMBERS.PNG[1] &&
      buf[2] === MAGIC_NUMBERS.PNG[2] &&
      buf[3] === MAGIC_NUMBERS.PNG[3]
    ) {
      return 'image/png';
    }

    // Check PDF
    if (
      buf[0] === MAGIC_NUMBERS.PDF[0] &&
      buf[1] === MAGIC_NUMBERS.PDF[1] &&
      buf[2] === MAGIC_NUMBERS.PDF[2] &&
      buf[3] === MAGIC_NUMBERS.PDF[3]
    ) {
      return 'application/pdf';
    }

    // Check WebP
    if (
      buf[0] === MAGIC_NUMBERS.WEBP[0] &&
      buf[1] === MAGIC_NUMBERS.WEBP[1] &&
      buf[2] === MAGIC_NUMBERS.WEBP[2] &&
      buf[3] === MAGIC_NUMBERS.WEBP[3]
    ) {
      return 'image/webp';
    }

    return null;
  }
}
