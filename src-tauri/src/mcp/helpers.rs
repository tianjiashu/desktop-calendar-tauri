// ========== MCP helper functions ==========
//
// Shared utilities for MCP tool implementations:
// - JSON serialization for tool text content
// - Widget UI meta attachment (return_ui pattern)
// - CallToolResult diagnostics logging

use rmcp::model::{CallToolResult, Content, Meta};
use serde::Serialize;
use serde_json::json;

/// Serialize any serializable value to a pretty-printed JSON string.
///
/// Used by all MCP tool handlers to produce `content[0].text` payloads.
/// Returns an empty string on serialization failure (should not happen
/// for our domain types, but avoids panicking in the tool hot path).
pub fn to_text_response<T: Serialize>(data: &T) -> String {
    serde_json::to_string_pretty(data).unwrap_or_default()
}

/// Attach Widget UI metadata and structured content to a tool result.
///
/// Call this when `return_ui == true` to:
/// 1. Set `_meta.ui.resourceUri` — Host reads this to find the Widget HTML
/// 2. Set `structuredContent` — Host pushes this to the Widget via `ontoolresult`
pub fn attach_ui_meta(
    result: &mut CallToolResult,
    resource_uri: &str,
    structured_content: serde_json::Value,
) {
    result.meta = Some(ui_meta(resource_uri));
    result.structured_content = Some(structured_content);
}

/// Build a `Meta` object containing `{ "ui": { "resourceUri": "..." } }`.
///
/// rmcp serializes `CallToolResult.meta` as `_meta` in the JSON-RPC response,
/// so the final wire format is `"_meta": { "ui": { "resourceUri": "..." } }`.
pub fn ui_meta(resource_uri: &str) -> Meta {
    let mut map = serde_json::Map::new();
    map.insert(
        "ui".into(),
        json!({ "resourceUri": resource_uri }),
    );
    Meta(map)
}

/// Log serialized CallToolResult key indicators for Widget rendering diagnostics.
///
/// Checks for the presence of `_meta`, `resourceUri`, and `structuredContent`
/// in the serialized JSON to verify the Widget rendering contract is satisfied.
pub fn log_serialized(tool_name: &str, result: &CallToolResult) {
    let serialized = serde_json::to_string(result).unwrap_or_default();
    tracing::info!(
        "[MCP-WIDGET] {} serialized: _meta={}, resourceUri={}, structuredContent={}, len={}",
        tool_name,
        serialized.contains("_meta"),
        serialized.contains("resourceUri"),
        serialized.contains("structuredContent"),
        serialized.len()
    );
}

/// Create a successful CallToolResult with a single text content item.
///
/// Convenience wrapper for `CallToolResult::success(vec![Content::text(text)])`.
pub fn text_result(text: String) -> CallToolResult {
    CallToolResult::success(vec![Content::text(text)])
}
