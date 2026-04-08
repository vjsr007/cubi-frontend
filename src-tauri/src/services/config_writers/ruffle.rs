use std::collections::HashMap;

use super::EmulatorConfigWriter;
use crate::models::{SETTING_FULLSCREEN, SETTING_RENDERER, SETTING_SPOOF_URL};

pub struct RuffleConfigWriter;

impl RuffleConfigWriter {
    fn renderer_arg(value: &str) -> &'static str {
        match value {
            "directx" => "dx12",
            "opengl" => "gl",
            _ => "vulkan",
        }
    }
}

impl EmulatorConfigWriter for RuffleConfigWriter {
    fn emulator_name(&self) -> &str {
        "Ruffle"
    }

    fn config_format(&self) -> &str {
        "cli"
    }

    fn supported_settings(&self) -> Vec<&str> {
        vec![SETTING_FULLSCREEN, SETTING_RENDERER, SETTING_SPOOF_URL]
    }

    fn default_config_path(&self) -> Option<String> {
        None
    }

    fn preview_config(&self, settings: &HashMap<String, String>) -> String {
        let mut args = vec!["ruffle".to_string()];

        if settings
            .get(SETTING_FULLSCREEN)
            .map(|v| v == "true")
            .unwrap_or(true)
        {
            args.push("--fullscreen".into());
        }

        if let Some(renderer) = settings.get(SETTING_RENDERER) {
            args.push("--graphics".into());
            args.push(Self::renderer_arg(renderer).into());
        }

        if let Some(spoof_url) = settings
            .get(SETTING_SPOOF_URL)
            .filter(|v| !v.trim().is_empty())
        {
            args.push("--spoof-url".into());
            args.push(format!("\"{}\"", spoof_url));
        }

        args.push("\"<movie.swf>\"".into());
        args.join(" ")
    }
}
