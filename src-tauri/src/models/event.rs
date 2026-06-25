// ========== Event model (Rust) ==========

use serde::{Deserialize, Serialize};

/// Event status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventStatus {
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "tentative")]
    Tentative,
}

impl EventStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "cancelled" => EventStatus::Cancelled,
            "tentative" => EventStatus::Tentative,
            _ => EventStatus::Confirmed,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            EventStatus::Confirmed => "confirmed",
            EventStatus::Cancelled => "cancelled",
            EventStatus::Tentative => "tentative",
        }
    }
}

/// Event type (for color mapping F18)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventType {
    #[serde(rename = "interview")]
    Interview,
    #[serde(rename = "meeting")]
    Meeting,
    #[serde(rename = "reminder")]
    Reminder,
    #[serde(rename = "deadline")]
    Deadline,
    #[serde(rename = "default")]
    Default,
}

impl EventType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "interview" => EventType::Interview,
            "meeting" => EventType::Meeting,
            "reminder" => EventType::Reminder,
            "deadline" => EventType::Deadline,
            _ => EventType::Default,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            EventType::Interview => "interview",
            EventType::Meeting => "meeting",
            EventType::Reminder => "reminder",
            EventType::Deadline => "deadline",
            EventType::Default => "default",
        }
    }
}

/// Creator identity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Creator {
    #[serde(rename = "human")]
    Human,
    #[serde(rename = "agent")]
    Agent,
}

impl Creator {
    pub fn from_str(s: &str) -> Self {
        match s {
            "agent" => Creator::Agent,
            _ => Creator::Human,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            Creator::Human => "human",
            Creator::Agent => "agent",
        }
    }
}

/// The main Event struct (matches DB schema one-to-one)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_time: i64, // Unix milliseconds, UTC
    pub end_time: i64,   // Unix milliseconds, UTC
    pub timezone: String,
    pub is_all_day: bool,
    pub rrule: Option<String>, // RFC 5545
    pub rrule_until: Option<i64>,
    pub exdates: Option<Vec<i64>>, // JSON array of exception dates
    pub status: EventStatus,
    pub color: String,
    pub event_type: EventType,
    pub location: Option<String>,
    pub url: Option<String>,
    pub created_by: Creator,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

/// Input for creating an event (from TS / MCP)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEventInput {
    pub title: String,
    pub description: Option<String>,
    pub start_time: i64,
    pub end_time: i64,
    #[serde(default = "default_timezone")]
    pub timezone: String,
    #[serde(default)]
    pub is_all_day: bool,
    pub rrule: Option<String>,
    pub rrule_until: Option<i64>,
    #[serde(default = "default_event_type")]
    pub event_type: EventType,
    #[serde(default = "default_color")]
    pub color: String,
    pub location: Option<String>,
    pub url: Option<String>,
}

fn default_timezone() -> String {
    "Asia/Shanghai".to_string()
}
fn default_event_type() -> EventType {
    EventType::Default
}
fn default_color() -> String {
    "#3B82F6".to_string()
}

/// Input for updating an event
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateEventInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
    pub timezone: Option<String>,
    pub is_all_day: Option<bool>,
    pub rrule: Option<String>,
    pub rrule_until: Option<i64>,
    pub event_type: Option<EventType>,
    pub color: Option<String>,
    pub location: Option<String>,
    pub url: Option<String>,
    pub status: Option<EventStatus>,
    #[serde(default)]
    pub clear_fields: Vec<ClearableEventField>,
}

/// Nullable fields that can be explicitly cleared during an update.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ClearableEventField {
    Description,
    Location,
    Url,
}

/// Time slot for free slot queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlot {
    pub start_time: i64,
    pub end_time: i64,
}

/// Generate UUID v7 (time-ordered)
pub fn generate_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

/// Get current timestamp in Unix ms
pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
