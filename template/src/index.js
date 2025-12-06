import { storage } from "@vendetta/plugin";
import { ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";

storage.theme ??= "dark-purple";

const themes = {
  "dark-purple": `
    --background-primary: #1a001a;
    --background-secondary: #120012;
    --background-tertiary: #0a000a;
    --channels-default: #d4b3ff;
    --text-normal: #e6ccff;
    --header-primary: #ffffff;
    --brand-experiment: #9f6bff;
  `,
  "amoled": `
    --background-primary: #000000;
    --background-secondary: #000000;
    --background-tertiary: #000000;
    --channels-default: #ffffff;
    --text-normal: #ffffff;
  `,
  "nord": `
    --background-primary: #2e3440;
    --background-secondary: #3b4252;
    --background-tertiary: #434c5e;
    --channels-default: #d8dee9;
    --text-normal: #eceff4;
    --brand-experiment: #88c0d0;
  `,
  "dracula": `
    --background-primary: #282a36;
    --background-secondary: #21222c;
    --background-tertiary: #191a21;
    --text-normal: #f8f8f2;
    --brand-experiment: #bd93f9;
  `,
  "sunset": `
    --background-primary: #ff6b6b;
    --background-secondary: #ee5a52;
    --background-tertiary: #c44569;
    --text-normal: #ffffff;
    --brand-experiment: #feca57;
  `
};

let styleSheet;

function applyTheme() {
  if (styleSheet) styleSheet.remove();
  const css = `:root {${themes[storage.theme]}}`;
  styleSheet = RN.StyleSheet.create({ theme: { css } }).theme;
}

export const onLoad = () => {
  applyTheme();
  showToast("theme loaded", "ic_theme");
};

export function Settings() {
  return (
    <RN.ScrollView style={{ flex: 1, padding: 16 }}>
      <RN.Text style={{ color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Choose Theme
      </RN.Text>

      {Object.keys(themes).map(key => (
        <RN.TouchableOpacity
          key={key}
          onPress={() => {
            storage.theme = key;
            applyTheme();
            showToast(`${key} applied`, "ic_check");
          }}
          style={{
            padding: 16,
            backgroundColor: storage.theme === key ? "#5865f2" : "#2b2d31",
            borderRadius: 12,
            marginBottom: 12
          }}
        >
          <RN.Text style={{ color: "white", fontWeight: "600", textTransform: "capitalize" }}>
            {key.replace("-", " ")}
          </RN.Text>
        </RN.TouchableOpacity>
      ))}
    </RN.ScrollView>
  );
}

export const onUnload = () => {
  if (styleSheet) styleSheet.remove();
};

export const settings = Settings;
