// ========== Reminder model ==========

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub event_id: String,
    pub remind_at: i64,         // Unix ms, UTC
    #[serde(rename = "type")]
    pub reminder_type: String,  // 'notification' | 'email' | 'sound'
    pub is_sent: bool,
    pub sent_at: Option<i64>,
}
