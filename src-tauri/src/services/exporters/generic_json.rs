use super::EmulatorExporter;
use crate::models::ButtonBinding;

pub struct GenericJsonExporter;

impl EmulatorExporter for GenericJsonExporter {
    fn emulator_name(&self) -> &str { "Generic" }
    fn file_extension(&self) -> &str { "json" }

    fn export(&self, bindings: &[ButtonBinding]) -> String {
        let map: std::collections::BTreeMap<String, serde_json::Value> = bindings
            .iter()
            .filter(|b| b.button_index >= 0)
            .map(|b| {
                let mut obj = serde_json::Map::new();
                obj.insert("button_index".into(), serde_json::json!(b.button_index));
                if let Some(ref axis) = b.axis_index {
                    obj.insert("axis_index".into(), serde_json::json!(axis));
                }
                if let Some(ref dir) = b.axis_direction {
                    obj.insert("axis_direction".into(), serde_json::json!(dir));
                }
                (b.action.clone(), serde_json::Value::Object(obj))
            })
            .collect();

        let wrapper = serde_json::json!({
            "_comment": "Cubi Frontend — Generic controller mapping export",
            "_generated": chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string(),
            "bindings": map,
        });
        serde_json::to_string_pretty(&wrapper).unwrap_or_default()
    }
}
