// ========== MCP Resources: Widget registry via ServerHandler trait ==========
//
// rmcp handles JSON-RPC `resources/list` and `resources/read` via the
// ServerHandler trait. This module provides the resource registry and
// read logic, which are called from the trait implementation in tools.rs.
//
// Widget HTML files live in `mcp/widgets/*.html` and are compile-time embedded.

use rmcp::model::{Meta, RawResource};
use serde_json::json;

use crate::error::AppError;
use crate::mcp::widgets;

/// List all available Widget resources exposed by this MCP server.
///
/// URI scheme: `ui://calendar/<widget-name>` (per MCP Apps spec).
/// Each resource carries `_meta.ui.csp` declaring trusted domains.
pub fn list_resources() -> Vec<rmcp::model::Resource> {
    let resources = vec![
        resource(
            "ui://calendar/events-list",
            "Events List Widget",
            "可交互的周事件列表 Widget（显示标题、时间、颜色）",
            "text/html;profile=mcp-app",
        ),
        resource(
            "ui://calendar/event-detail",
            "Event Detail Widget",
            "单个事件详情 Widget（完整字段展示）",
            "text/html;profile=mcp-app",
        ),
        resource(
            "ui://calendar/free-slots",
            "Free Slots Widget",
            "空闲时间段列表 Widget（可交互的时间槽展示）",
            "text/html;profile=mcp-app",
        ),
    ];

    // Log each resource's key fields for debugging
    for r in &resources {
        let csp = r
            .raw
            .meta
            .as_ref()
            .and_then(|m| m.get("ui"))
            .and_then(|ui| ui.get("csp"));
        tracing::info!(
            "[MCP-WIDGET] resources/list: uri={} mime={} has_meta={} has_csp={}",
            r.raw.uri,
            r.raw.mime_type.as_deref().unwrap_or("none"),
            r.raw.meta.is_some(),
            csp.is_some(),
        );
    }

    resources
}

/// Helper to create a Resource from its raw fields.
///
/// Attaches `_meta.ui.csp` declaring allowed `resourceDomains` and
/// `connectDomains` per MCP Apps security requirements.
fn resource(uri: &str, name: &str, description: &str, mime_type: &str) -> rmcp::model::Resource {
    let csp_meta = build_csp_meta();

    let csp_json = serde_json::to_string(&csp_meta).unwrap_or_default();
    tracing::info!("[MCP-WIDGET] resource: uri={} csp_meta={}", uri, csp_json);

    rmcp::model::Resource {
        raw: RawResource {
            uri: uri.into(),
            name: name.into(),
            description: Some(description.into()),
            mime_type: Some(mime_type.into()),
            size: None,
            title: None,
            icons: None,
            meta: Some(csp_meta),
        },
        annotations: None,
    }
}

/// Build `_meta` with CSP configuration for Widget resources.
///
/// Declares:
/// - `resourceDomains`: allowed ESM import sources (esm.sh, cdn.jsdelivr.net)
/// - `connectDomains`: allowed outbound connections
fn build_csp_meta() -> Meta {
    Meta(serde_json::Map::from_iter([(
        "ui".into(),
        json!({
            "csp": {
                "resourceDomains": [
                    "https://esm.sh",
                    "https://cdn.jsdelivr.net"
                ],
                "connectDomains": [
                    "https://esm.sh",
                    "https://cdn.jsdelivr.net"
                ]
            }
        }),
    )]))
}

/// Read a Widget resource by URI.
///
/// Returns the complete self-contained HTML page for the Host to render.
pub fn read_resource(uri: &str) -> Result<Vec<rmcp::model::ResourceContents>, AppError> {
    let html = match uri {
        "ui://calendar/events-list" => widgets::build_events_list_html(),
        "ui://calendar/event-detail" => widgets::build_event_detail_html(),
        "ui://calendar/free-slots" => widgets::build_free_slots_html(),
        _ => {
            tracing::warn!("[MCP-WIDGET] read_resource: NOT_FOUND uri={}", uri);
            return Err(AppError::ResourceNotFound(uri.to_string()));
        }
    };

    // Log key indicators that CodeBuddy Host needs for widget rendering
    let has_ext_apps = html.contains("ext-apps");
    let has_connect = html.contains("app.connect()");
    let has_ontoolresult = html.contains("ontoolresult");
    let has_theme = html.contains("hostcontextchanged");
    let has_csp_meta = html.contains("Content-Security-Policy");
    let has_light_dark = html.contains("light-dark");

    tracing::info!(
        "[MCP-WIDGET] read_resource: uri={} html_len={} \
         ext-apps={} connect={} ontoolresult={} theme={} csp-meta={} light-dark={}",
        uri,
        html.len(),
        has_ext_apps,
        has_connect,
        has_ontoolresult,
        has_theme,
        has_csp_meta,
        has_light_dark,
    );

    Ok(vec![rmcp::model::ResourceContents::text(html, uri)])
}
