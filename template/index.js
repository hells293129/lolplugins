// ==UserScript==
// @name         Local Message Editor
// @author       You
// @version      1.0.3
// @description  Lets you locally edit any message's text (only you see it, gone on app restart)
// @match        https://discord.com/*
// @match        https://canary.discord.com/*
// @match        https://ptb.discord.com/*
// @run-at       document-start
// ==/UserScript==

import { React, ReactNative as RN } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";

const patches = [];

// Initialize storage
storage.editedMessages ??= {};

const MessageActions = findByProps("showMessageActionSheet");
const MessageStore = findByStoreName("MessageStore");

export const onLoad = () => {
  // Add "Edit User Text (Local Only)" to the message long-press menu
  patches.push(
    after("showMessageActionSheet", MessageActions, (_, { message, navigation }) => {
      if (!message || message.author?.id === "1") return; // skip system messages

      const options = navigation.addButton?.("options") ?? navigation.getArgument?.("options");
      if (!Array.isArray(options)) return;

      options.push({
        label: "Edit User Text (Local Only)",
        icon: "ic_edit_24px",
        onPress: () => showEditDialog(message),
      });
    })
  );

  // Patch rendered messages to show locally edited content
  const MessageContent = findByProps("MessageContent")?.default ||
                        findByProps("Message")?.default;

  if (MessageContent) {
    patches.push(
      after("default", MessageContent, ([props], ret) => {
        const msg = props?.message;
        if (!msg?.id) return ret;

        const edited = storage.editedMessages[msg.id];
        if (edited === undefined) return ret;

        try {
          // Most common structures across Discord updates
          if (ret?.props?.children?.props?.content) {
            ret.props.children.props.content = edited;
          }
          if (ret?.props?.content) {
            ret.props.content = edited;
          }
          if (ret?.props?.children?.props?.children?.props?.content) {
            ret.props.children.props.children.props.content = edited;
          }
          // Newer structure (2025)
          if (Array.isArray(ret?.props?.children)) {
            const textNode = ret.props.children.find(c => c?.props?.content);
            if (textNode) textNode.props.content = edited;
          }
        } catch (e) {
          console.warn("[LocalMessageEditor] Failed to patch message render:", e);
        }

        return ret;
      })
    );
  }

  showToast("Local Message Editor Loaded", "ic_check");
};

function showEditDialog(message) {
  const current = storage.editedMessages[message.id] ?? message.content ?? "";

  RN.Alert.prompt(
    "Edit Message (Local Only)",
    "Only you see this • disappears on restart",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: (text) => {
          const trimmed = text?.trim();
          if (!trimmed || trimmed === message.content) {
            delete storage.editedMessages[message.id];
            showToast("Edit removed", "ic_close");
          } else {
            storage.editedMessages[message.id] = trimmed;
            showToast("Saved locally", "ic_check");
          }

          // Force a tiny update so the message re-renders instantly
          setTimeout(() => {
            try {
              MessageStore.getState()?._actionHandler?.MESSAGE_UPDATE?.({
                message: { ...message, edited_timestamp: new Date().toISOString() },
              });
            } catch {}
          }, 100);
        },
      },
    ],
    "plain-text",
    current,
    "message-content"
  );
}

export function Settings() {
  const count = Object.keys(storage.editedMessages || {}).length;

  return (
    <RN.ScrollView style={{ flex: 1, padding: 16 }}>
      <RN.View style={{ backgroundColor: "#2b2d31", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <RN.Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
          Local Message Editor
        </RN.Text>
        <RN.Text style={{ color: "#b5bac1" }}>
          {count === 0 ? "No local edits yet" : `Edited ${count} message(s) locally`}
        </RN.Text>
      </RN.View>

      {count > 0 && (
        <RN.TouchableOpacity
          onPress={() => {
            storage.editedMessages = {};
            showToast("All local edits cleared", "ic_check");
          }}
          style={{
            backgroundColor: "#f04747",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <RN.Text style={{ color: "white", fontWeight: "600" }}>
            Clear All Local Edits
          </RN.Text>
        </RN.TouchableOpacity>
      )}
    </RN.ScrollView>
  );
}

export const onUnload = () => {
  patches.forEach((p) => p?.());
};

export const settings = Settings;
