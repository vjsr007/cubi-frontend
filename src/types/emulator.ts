export interface EmulatorChoice {
  emulator_name: string;
  detected_path?: string;
  is_installed: boolean;
}

export interface SystemEmulatorChoice {
  system_id: string;
  system_name: string;
  available_emulators: EmulatorChoice[];
  selected_emulator?: string;
}
