// ========== Diagnostic types ==========

export interface DiagnosticEntry {
  timestamp: string;   // ISO 8601
  level: string;       // ERROR | WARN | INFO | PANIC
  module: string;
  message: string;
}

export interface SystemDiagnostic {
  log_dir: string;
  db_path: string;
  db_wal_enabled: boolean;
  mcp_port: number;
  mcp_running: boolean;
  recent_errors: DiagnosticEntry[];
}
