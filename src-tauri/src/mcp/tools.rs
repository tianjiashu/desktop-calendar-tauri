// ========== MCP Tool implementations (rmcp #[tool] macros) ==========
//
// Each tool is an async method decorated with #[tool]. rmcp auto-generates:
//   - JSON Schema from function signature (via schemars)
//   - Parameter deserialization and validation (via serde)
//   - Tool routing via #[tool_router] on the impl block

use rmcp::handler::server::wrapper::Parameters;
use rmcp::handler::server::ServerHandler;
use rmcp::model::{
    CallToolResult, GetPromptResult, Implementation, ListPromptsResult, ListResourcesResult,
    PaginatedRequestParams, Prompt, PromptMessage, PromptMessageRole, ReadResourceRequestParams,
    ReadResourceResult, ServerCapabilities, ServerInfo,
};
use rmcp::service::RequestContext;
use rmcp::tool;
use rmcp::{tool_handler, tool_router, ErrorData};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::json;
use tauri::AppHandle;
use tauri::Emitter;

use crate::db::event_repo;
use crate::error::AppError;
use crate::mcp::helpers::{attach_ui_meta, log_serialized, text_result, to_text_response};
use crate::mcp::resources;
use crate::models::event::*;

/// Shared service state for MCP tool execution.
#[derive(Clone)]
pub struct CalendarMcpService {
    pub db: std::sync::Arc<std::sync::Mutex<rusqlite::Connection>>,
    pub app_handle: AppHandle,
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_TITLE_LEN: usize = 200;
const MAX_DESC_LEN: usize = 2000;
const MAX_LOCATION_LEN: usize = 500;
const MAX_URL_LEN: usize = 2000;
const MAX_LIST_RANGE_DAYS: i64 = 90;
const MAX_FREE_SLOT_MINUTES: i64 = 480; // 8 hours
const MIN_FREE_SLOT_MINUTES: i64 = 5;
const MS_PER_DAY: i64 = 24 * 60 * 60 * 1000;

/// Example timestamp for error messages: 2026-06-23 14:00 CST in Unix ms.
/// Pre-computed to avoid unwrap() in validate_time_range hot path.
const EXAMPLE_TIMESTAMP_MS: i64 = 1750744800000;

// ── Widget UI meta (for tool definition _meta.ui.resourceUri) ────────────────
const UI_EVENTS_LIST: &str = "ui://calendar/events-list";
const UI_EVENT_DETAIL: &str = "ui://calendar/event-detail";
const UI_FREE_SLOTS: &str = "ui://calendar/free-slots";

// ── Tool argument structs (schemars derives for auto JSON Schema) ──────────

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListEventsArgs {
    /// 开始时间 (Unix 毫秒时间戳, UTC)
    pub start_date: i64,
    /// 结束时间 (Unix 毫秒时间戳, UTC)。必须大于 start_date，建议范围 ≤ 90 天
    pub end_date: i64,
    /// 设为 true 时返回可交互的 Widget UI（在 CodeBuddy/WorkBuddy 中渲染）
    #[serde(default)]
    pub return_ui: bool,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetEventArgs {
    /// 事件 ID（UUID v7 格式）
    pub event_id: String,
    /// 设为 true 时返回可交互的 Widget UI
    #[serde(default)]
    pub return_ui: bool,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateEventArgs {
    /// 事件标题（1-200 字符，不能为空）
    pub title: String,
    /// 开始时间 (Unix 毫秒时间戳, UTC)。必须小于 end_time
    pub start_time: i64,
    /// 结束时间 (Unix 毫秒时间戳, UTC)。必须大于 start_time
    pub end_time: i64,
    /// 事件描述（最长 2000 字符）
    pub description: Option<String>,
    /// 时区标识符，例如 "Asia/Shanghai"。默认 "Asia/Shanghai"
    pub timezone: Option<String>,
    /// 是否为全天事件
    pub is_all_day: Option<bool>,
    /// 事件类型: "interview"(面试) | "meeting"(会议) | "reminder"(提醒) | "deadline"(截止) | "default"(其他)
    pub event_type: Option<String>,
    /// 颜色，格式 #RRGGBB（例如 "#3B82F6"）。默认蓝色
    pub color: Option<String>,
    /// 地点（最长 500 字符）
    pub location: Option<String>,
    /// 关联链接（最长 2000 字符）
    pub url: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct UpdateEventArgs {
    /// 事件 ID（UUID v7 格式）
    pub event_id: String,
    /// 新标题（1-200 字符）
    pub title: Option<String>,
    /// 新开始时间 (Unix 毫秒时间戳, UTC)
    pub start_time: Option<i64>,
    /// 新结束时间 (Unix 毫秒时间戳, UTC)
    pub end_time: Option<i64>,
    /// 新描述（最长 2000 字符）
    pub description: Option<String>,
    /// 新类型: "interview"|"meeting"|"reminder"|"deadline"|"default"
    pub event_type: Option<String>,
    /// 新颜色，格式 #RRGGBB
    pub color: Option<String>,
    /// 新地点（最长 500 字符）
    pub location: Option<String>,
    /// 新链接（最长 2000 字符）
    pub url: Option<String>,
    /// 事件状态: "confirmed"(已确认) | "cancelled"(已取消) | "tentative"(待定)
    pub status: Option<String>,
    /// Explicitly clear nullable fields. Allowed values: "description", "location", "url"
    pub clear_fields: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DeleteEventArgs {
    /// 事件 ID（UUID v7 格式）。软删除，设置 deleted_at 时间戳
    pub event_id: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetFreeSlotsArgs {
    /// 查询日期 (Unix 毫秒时间戳, 当天0点 UTC)
    pub date: i64,
    /// 需要的时长（分钟）。范围 5-480（8小时）
    pub duration_minutes: i64,
    /// 设为 true 时返回可交互的 Widget UI
    #[serde(default)]
    pub return_ui: bool,
}

// ── Validation helpers ─────────────────────────────────────────────────────

fn validate_title(title: &str) -> Result<(), AppError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidToolArgs("title 不能为空字符串".into()));
    }
    if trimmed.len() > MAX_TITLE_LEN {
        return Err(AppError::InvalidToolArgs(format!(
            "title 不能超过 {} 字符，当前 {} 字符",
            MAX_TITLE_LEN,
            trimmed.len()
        )));
    }
    Ok(())
}

fn validate_time_range(start: i64, end: i64) -> Result<(), AppError> {
    if start >= end {
        return Err(AppError::InvalidToolArgs(format!(
            "start_time({}) 必须小于 end_time({})。时间单位为 Unix 毫秒时间戳(UTC)。\
             例如: 2026-06-23 14:00 CST 对应 {}。",
            start, end, EXAMPLE_TIMESTAMP_MS
        )));
    }
    Ok(())
}

fn validate_list_time_range(start: i64, end: i64) -> Result<(), AppError> {
    validate_time_range(start, end)?;
    let span = end
        .checked_sub(start)
        .ok_or_else(|| AppError::InvalidToolArgs("time range is too large".into()))?;
    let max_span = MAX_LIST_RANGE_DAYS * MS_PER_DAY;
    if span > max_span {
        return Err(AppError::InvalidToolArgs(format!(
            "list_events range cannot exceed {} days",
            MAX_LIST_RANGE_DAYS
        )));
    }
    Ok(())
}

fn validate_day_start_utc(date: i64) -> Result<(), AppError> {
    if date.rem_euclid(MS_PER_DAY) != 0 {
        return Err(AppError::InvalidToolArgs(
            "date must be the UTC day-start timestamp in Unix milliseconds".into(),
        ));
    }
    Ok(())
}

fn validate_duration_minutes(duration: i64) -> Result<(), AppError> {
    if duration < MIN_FREE_SLOT_MINUTES {
        return Err(AppError::InvalidToolArgs(format!(
            "duration_minutes 不能小于 {} 分钟，当前 {}",
            MIN_FREE_SLOT_MINUTES, duration
        )));
    }
    if duration > MAX_FREE_SLOT_MINUTES {
        return Err(AppError::InvalidToolArgs(format!(
            "duration_minutes 不能超过 {} 分钟（8小时），当前 {}",
            MAX_FREE_SLOT_MINUTES, duration
        )));
    }
    Ok(())
}

fn validate_opt_len(value: &Option<String>, field: &str, max: usize) -> Result<(), AppError> {
    if let Some(v) = value {
        if v.len() > max {
            return Err(AppError::InvalidToolArgs(format!(
                "{} 不能超过 {} 字符，当前 {} 字符",
                field,
                max,
                v.len()
            )));
        }
    }
    Ok(())
}

fn validate_color(color: &Option<String>) -> Result<(), AppError> {
    if let Some(c) = color {
        if c.len() != 7 || !c.starts_with('#') || !c[1..].chars().all(|ch| ch.is_ascii_hexdigit()) {
            return Err(AppError::InvalidToolArgs(format!(
                "color 格式应为 #RRGGBB（如 #3B82F6），当前 '{}'",
                c
            )));
        }
    }
    Ok(())
}

fn validate_url(url: &Option<String>) -> Result<(), AppError> {
    if let Some(raw) = url {
        let trimmed = raw.trim();
        let lower = trimmed.to_ascii_lowercase();
        if trimmed.is_empty()
            || !(lower.starts_with("https://")
                || lower.starts_with("http://")
                || lower.starts_with("mailto:"))
        {
            return Err(AppError::InvalidToolArgs(
                "url must start with http://, https://, or mailto:".into(),
            ));
        }
    }
    Ok(())
}

fn parse_event_type(value: Option<&str>) -> Result<Option<EventType>, AppError> {
    value
        .map(|raw| match raw.trim() {
            "interview" => Ok(EventType::Interview),
            "meeting" => Ok(EventType::Meeting),
            "reminder" => Ok(EventType::Reminder),
            "deadline" => Ok(EventType::Deadline),
            "default" => Ok(EventType::Default),
            other => Err(AppError::InvalidToolArgs(format!(
                "event_type '{}' is invalid; expected interview, meeting, reminder, deadline, or default",
                other
            ))),
        })
        .transpose()
}

fn parse_event_status(value: Option<&str>) -> Result<Option<EventStatus>, AppError> {
    value
        .map(|raw| match raw.trim() {
            "confirmed" => Ok(EventStatus::Confirmed),
            "cancelled" => Ok(EventStatus::Cancelled),
            "tentative" => Ok(EventStatus::Tentative),
            other => Err(AppError::InvalidToolArgs(format!(
                "status '{}' is invalid; expected confirmed, cancelled, or tentative",
                other
            ))),
        })
        .transpose()
}

fn parse_clear_fields(value: Option<&[String]>) -> Result<Vec<ClearableEventField>, AppError> {
    let mut fields = Vec::new();
    if let Some(raw_fields) = value {
        for raw in raw_fields {
            let field = match raw.trim() {
                "description" => ClearableEventField::Description,
                "location" => ClearableEventField::Location,
                "url" => ClearableEventField::Url,
                other => {
                    return Err(AppError::InvalidToolArgs(format!(
                        "clear_fields contains invalid field '{}'; expected description, location, or url",
                        other
                    )))
                }
            };
            if fields.contains(&field) {
                return Err(AppError::InvalidToolArgs(format!(
                    "clear_fields contains duplicate field '{}'",
                    raw
                )));
            }
            fields.push(field);
        }
    }
    Ok(fields)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_event_type_and_status() {
        assert!(parse_event_type(Some("birthday")).is_err());
        assert!(parse_event_status(Some("deleted")).is_err());
        assert_eq!(
            parse_event_type(Some("meeting")).unwrap(),
            Some(EventType::Meeting)
        );
        assert_eq!(
            parse_event_status(Some("cancelled")).unwrap(),
            Some(EventStatus::Cancelled)
        );
    }

    #[test]
    fn validates_hex_color_format() {
        assert!(validate_color(&Some("#3B82F6".into())).is_ok());
        assert!(validate_color(&Some("#GGGGGG".into())).is_err());
        assert!(validate_color(&Some("#123".into())).is_err());
    }

    #[test]
    fn validates_url_scheme() {
        assert!(validate_url(&Some("https://example.com".into())).is_ok());
        assert!(validate_url(&Some("mailto:team@example.com".into())).is_ok());
        assert!(validate_url(&Some("javascript:alert(1)".into())).is_err());
    }

    #[test]
    fn validates_list_range_limit_and_day_start() {
        assert!(validate_list_time_range(0, MAX_LIST_RANGE_DAYS * MS_PER_DAY).is_ok());
        assert!(validate_list_time_range(0, (MAX_LIST_RANGE_DAYS + 1) * MS_PER_DAY).is_err());
        assert!(validate_day_start_utc(0).is_ok());
        assert!(validate_day_start_utc(1).is_err());
    }

    #[test]
    fn parses_clear_fields_strictly() {
        let fields = vec!["description".to_string(), "url".to_string()];
        assert_eq!(
            parse_clear_fields(Some(fields.as_slice())).unwrap(),
            vec![ClearableEventField::Description, ClearableEventField::Url]
        );

        let invalid = vec!["timezone".to_string()];
        assert!(parse_clear_fields(Some(invalid.as_slice())).is_err());
    }
}

// ── Tool implementations ───────────────────────────────────────────────────

#[tool_router]
impl CalendarMcpService {
    /// 按日期范围查询事件列表
    #[tool(
        description = "按日期范围查询事件列表。返回指定时间范围内的所有事件（不含已删除）。\
        start_date/end_date 为 Unix 毫秒时间戳(UTC)。范围过大会影响性能，建议 ≤ 90 天。\
        设置 return_ui=true 可在对话中渲染交互式周视图卡片。",
        meta = rmcp::model::Meta(serde_json::Map::from_iter([("ui".into(), serde_json::json!({"resourceUri": UI_EVENTS_LIST}))]))
    )]
    async fn list_events(
        &self,
        Parameters(args): Parameters<ListEventsArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        validate_list_time_range(args.start_date, args.end_date)?;

        let conn = lock_db(&self.db)?;
        let events = event_repo::find_by_date_range(&conn, args.start_date, args.end_date)?;

        let data = json!({ "events": events, "count": events.len() });
        let mut result = text_result(to_text_response(&data));

        if args.return_ui {
            tracing::info!(
                "[MCP-WIDGET] list_events: return_ui=true, attaching _meta + structuredContent (events={})",
                events.len()
            );
            attach_ui_meta(&mut result, UI_EVENTS_LIST, data);
        }

        log_serialized("list_events", &result);
        Ok(result)
    }

    /// 获取单个事件详情
    #[tool(
        description = "获取单个事件详情。event_id 为 UUID v7 格式的事件ID。\
        设置 return_ui=true 可在对话中渲染交互式事件详情卡片。",
        meta = rmcp::model::Meta(serde_json::Map::from_iter([("ui".into(), serde_json::json!({"resourceUri": UI_EVENT_DETAIL}))]))
    )]
    async fn get_event(
        &self,
        Parameters(args): Parameters<GetEventArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        let conn = lock_db(&self.db)?;
        let event = event_repo::find_by_id(&conn, &args.event_id)?
            .ok_or_else(|| AppError::EventNotFound(args.event_id.clone()))?;

        let mut result = text_result(to_text_response(&event));

        if args.return_ui {
            tracing::info!(
                "[MCP-WIDGET] get_event: return_ui=true, attaching _meta + structuredContent (id={})",
                event.id
            );
            let structured = serde_json::to_value(&event).unwrap_or_default();
            attach_ui_meta(&mut result, UI_EVENT_DETAIL, structured);
        }

        log_serialized("get_event", &result);
        Ok(result)
    }

    /// 创建新事件
    #[tool(
        description = "创建新日历事件。title 必填(1-200字符)。start_time/end_time 为 Unix 毫秒时间戳(UTC)，\
        start_time 必须小于 end_time。event_type 可选值: interview(面试)/meeting(会议)/reminder(提醒)/deadline(截止)/default(其他)。\
        color 格式 #RRGGBB，默认 #3B82F6。创建成功后会实时同步到桌面日历界面。"
    )]
    async fn create_event(
        &self,
        Parameters(args): Parameters<CreateEventArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        validate_title(&args.title)?;
        validate_time_range(args.start_time, args.end_time)?;
        validate_opt_len(&args.description, "description", MAX_DESC_LEN)?;
        validate_opt_len(&args.location, "location", MAX_LOCATION_LEN)?;
        validate_opt_len(&args.url, "url", MAX_URL_LEN)?;
        validate_color(&args.color)?;
        validate_url(&args.url)?;
        let event_type =
            parse_event_type(args.event_type.as_deref())?.unwrap_or(EventType::Default);

        let conn = lock_db(&self.db)?;

        let input = CreateEventInput {
            title: args.title.trim().to_string(),
            start_time: args.start_time,
            end_time: args.end_time,
            description: args.description,
            timezone: args.timezone.unwrap_or_else(|| "Asia/Shanghai".into()),
            is_all_day: args.is_all_day.unwrap_or(false),
            event_type,
            color: args.color.unwrap_or_else(|| "#3B82F6".into()),
            location: args.location,
            url: args.url,
            rrule: None,
            rrule_until: None,
        };

        let event = event_repo::create_event(&conn, input)?;
        emit_db_change(&self.app_handle, "events", "create", &event.id);

        let data = json!({ "ok": true, "event": &event });
        Ok(text_result(to_text_response(&data)))
    }

    /// 更新已有事件
    #[tool(
        description = "更新已有事件。event_id 必填。仅需提供要修改的字段，未提供的字段保持不变。\
        start_time/end_time 修改时会交叉校验时间合法性。status 可选: confirmed(已确认)/cancelled(已取消)/tentative(待定)。\
        更新成功后会实时同步到桌面日历界面。"
    )]
    async fn update_event(
        &self,
        Parameters(args): Parameters<UpdateEventArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        if let Some(ref t) = args.title {
            validate_title(t)?;
        }
        // 交叉校验：当 start_time 和 end_time 同时提供时，确保 start < end
        if let (Some(start), Some(end)) = (args.start_time, args.end_time) {
            validate_time_range(start, end)?;
        }
        validate_opt_len(&args.description, "description", MAX_DESC_LEN)?;
        validate_opt_len(&args.location, "location", MAX_LOCATION_LEN)?;
        validate_opt_len(&args.url, "url", MAX_URL_LEN)?;
        validate_color(&args.color)?;
        validate_url(&args.url)?;
        let event_type = parse_event_type(args.event_type.as_deref())?;
        let status = parse_event_status(args.status.as_deref())?;
        let clear_fields = parse_clear_fields(args.clear_fields.as_deref())?;

        let conn = lock_db(&self.db)?;

        let input = UpdateEventInput {
            title: args.title.map(|s| s.trim().to_string()),
            description: args.description,
            start_time: args.start_time,
            end_time: args.end_time,
            timezone: None,
            is_all_day: None,
            rrule: None,
            rrule_until: None,
            event_type,
            color: args.color,
            location: args.location,
            url: args.url,
            status,
            clear_fields,
        };

        let event = event_repo::update_event(&conn, &args.event_id, input)?;
        emit_db_change(&self.app_handle, "events", "update", &event.id);

        let data = json!({ "ok": true, "event": &event });
        Ok(text_result(to_text_response(&data)))
    }

    /// 软删除事件（设置 deleted_at）
    #[tool(
        description = "软删除事件。设置 deleted_at 时间戳，事件数据保留可恢复。\
        若事件已被删除或不存在，返回错误提示。删除成功后会实时同步到桌面日历界面。"
    )]
    async fn delete_event(
        &self,
        Parameters(args): Parameters<DeleteEventArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        let conn = lock_db(&self.db)?;

        event_repo::soft_delete(&conn, &args.event_id)?;
        emit_db_change(&self.app_handle, "events", "delete", &args.event_id);

        let data = json!({ "ok": true, "deleted": &args.event_id });
        Ok(text_result(to_text_response(&data)))
    }

    /// 查询指定日期的空闲时间段
    #[tool(
        description = "查询指定日期的空闲时间段。date 为查询日期(Unix 毫秒时间戳, 当天0点 UTC)。\
        duration_minutes 为需要的时长(分钟)，范围 5-480(8小时)。\
        返回该日期内所有满足 duration_minutes 的空闲槽位。设置 return_ui=true 可在对话中渲染交互式时间槽卡片。",
        meta = rmcp::model::Meta(serde_json::Map::from_iter([("ui".into(), serde_json::json!({"resourceUri": UI_FREE_SLOTS}))]))
    )]
    async fn get_free_slots(
        &self,
        Parameters(args): Parameters<GetFreeSlotsArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        validate_duration_minutes(args.duration_minutes)?;
        validate_day_start_utc(args.date)?;

        let conn = lock_db(&self.db)?;
        let duration = args.duration_minutes as i32;
        let slots = event_repo::find_free_slots(&conn, args.date, duration)?;

        let data = json!({ "free_slots": slots, "count": slots.len() });
        let mut result = text_result(to_text_response(&data));

        if args.return_ui {
            tracing::info!(
                "[MCP-WIDGET] get_free_slots: return_ui=true, attaching _meta + structuredContent (slots={})",
                slots.len()
            );
            attach_ui_meta(&mut result, UI_FREE_SLOTS, data);
        }

        log_serialized("get_free_slots", &result);
        Ok(result)
    }
}

// ── ServerHandler trait implementation ─────────────────────────────────────

#[tool_handler]
impl ServerHandler for CalendarMcpService {
    fn get_info(&self) -> ServerInfo {
        tracing::info!(
            "[MCP-WIDGET] server initialized: capabilities=tools+resources+prompts, widgets=3"
        );
        ServerInfo::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .enable_prompts()
                .build(),
        )
        .with_server_info(Implementation::from_build_env())
        .with_instructions(USAGE_GUIDE)
    }

    async fn list_resources(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<rmcp::service::RoleServer>,
    ) -> Result<ListResourcesResult, ErrorData> {
        tracing::info!("[MCP-WIDGET] HOST requested resources/list");
        let resources = resources::list_resources();
        let count = resources.len();
        for r in &resources {
            let meta_str = serde_json::to_string(&r.raw.meta).unwrap_or_default();
            tracing::info!(
                "[MCP-WIDGET] resources/list item: uri={} _meta={}",
                r.raw.uri,
                meta_str
            );
        }
        tracing::info!("[MCP-WIDGET] resources/list: returning {} resources", count);
        Ok(ListResourcesResult {
            resources,
            next_cursor: None,
            meta: None,
        })
    }

    async fn read_resource(
        &self,
        request: ReadResourceRequestParams,
        _context: RequestContext<rmcp::service::RoleServer>,
    ) -> Result<ReadResourceResult, ErrorData> {
        tracing::info!(
            "[MCP-WIDGET] HOST requested resources/read: uri={}",
            request.uri
        );
        let contents = resources::read_resource(&request.uri)?;
        Ok(ReadResourceResult::new(contents))
    }

    async fn list_prompts(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<rmcp::service::RoleServer>,
    ) -> Result<ListPromptsResult, ErrorData> {
        Ok(ListPromptsResult {
            prompts: vec![Prompt::new(
                "usage-guide",
                Some("桌面日历使用指南 — 了解所有工具和 Widget 的正确用法"),
                None,
            )],
            next_cursor: None,
            meta: None,
        })
    }

    async fn get_prompt(
        &self,
        request: rmcp::model::GetPromptRequestParams,
        _context: RequestContext<rmcp::service::RoleServer>,
    ) -> Result<GetPromptResult, ErrorData> {
        let content = match request.name.as_str() {
            "usage-guide" => USAGE_GUIDE,
            _ => {
                return Err(ErrorData::resource_not_found(
                    format!("未找到 prompt: {}", request.name),
                    None,
                ))
            }
        };

        Ok(GetPromptResult::new(vec![PromptMessage::new_text(
            PromptMessageRole::User,
            content,
        )])
        .with_description("桌面日历 MCP Server 完整使用指南"))
    }
}

// ── Usage guide prompt ─────────────────────────────────────────────────────

const USAGE_GUIDE: &str = "\
# 桌面日历 MCP Server — 使用指南

## 可用工具 (6个)

| 工具 | 用途 | 关键参数 |
|------|------|----------|
| `list_events` | 按日期范围查询事件 | `start_date`, `end_date` (Unix ms UTC) |
| `get_event` | 获取单个事件详情 | `event_id` |
| `create_event` | 创建新事件 | `title`, `start_time`, `end_time` (必填) |
| `update_event` | 更新已有事件 | `event_id` (必填), 其他字段可选 |
| `delete_event` | 软删除事件 | `event_id` |
| `get_free_slots` | 查询空闲时间段 | `date`, `duration_minutes` (5-480) |

## 参数约束

- **时间格式**: 所有时间参数为 Unix 毫秒时间戳(UTC)，不是秒。
  - 示例: 2026-06-23 14:00 CST = 某个毫秒值
  - 获取当前时间毫秒: `Date.now()` (JS) 或 `time.time()*1000` (Python)
- **title**: 1-200 字符，不能为空或纯空格
- **description**: 最长 2000 字符
- **location**: 最长 500 字符
- **url**: 最长 2000 字符
- **color**: 格式 #RRGGBB（如 #3B82F6）
- **event_type**: interview(面试) / meeting(会议) / reminder(提醒) / deadline(截止) / default(其他)
- **status**: confirmed(已确认) / cancelled(已取消) / tentative(待定)

## return_ui 机制

`list_events`, `get_event`, `get_free_slots` 支持 `return_ui: true`。
当设为 true 时，返回结果会附带 `_meta.ui.resourceUri`，
CodeBuddy/WorkBuddy 会自动渲染为可交互的 Widget 卡片。
同时 `structuredContent` 会包含数据，Widget 可直接渲染无需额外请求。

## 实时同步

`create_event` / `update_event` / `delete_event` 执行成功后，
桌面日历界面会自动刷新，无需手动操作。

## 典型场景

1. **查看本周日程**: list_events(start_date=本周一0点, end_date=下周一0点)
2. **添加会议**: create_event(title=\"团队周会\", start_time=..., end_time=..., event_type=\"meeting\")
3. **查找空闲**: get_free_slots(date=今天0点, duration_minutes=30)
4. **修改时间**: update_event(event_id=\"...\", start_time=..., end_time=...)
5. **取消事件**: update_event(event_id=\"...\", status=\"cancelled\")
";

// ── Helpers ────────────────────────────────────────────────────────────────

/// Lock the shared DB connection, mapping poison errors.
fn lock_db(
    db: &std::sync::Mutex<rusqlite::Connection>,
) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, AppError> {
    db.lock()
        .map_err(|e| AppError::Internal(format!("Mutex lock poisoned: {}", e)))
}

/// Emit a Tauri event when data changes (for real-time GUI sync).
fn emit_db_change(app_handle: &AppHandle, table: &str, action: &str, id: &str) {
    let payload = json!({
        "table": table,
        "action": action,
        "id": id,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    let _ = app_handle.emit("db:events_changed", payload);
}
