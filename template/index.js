import { React, ReactNative as RN } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";

storage.editedMessages ??= {};

const MessageActions = findByProps("showMessageActionSheet");
const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");

const patches: Function[] = [];

export const onLoad = () => {
    // Add menu option
    patches.push(
        after("showMessageActionSheet", MessageActions, (_, { message, navigation }) => {
            if (!message || message.author?.id === "1") return;

            const options = navigation.getArgument?.("options");
            if (!Array.isArray(options)) return;

            options.push({
                label: "Edit User Text (Local Only)",
                icon: "ic_edit_24px",
                onPress: () => showEditDialog(message)
            });
        })
    );

    // Patch message rendering
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
                    // New Discord structure
                    if (ret?.props?.children?.props?.content) {
                        ret.props.children.props.content = edited;
                    }
                    // Fallbacks
                    if (ret?.props?.content) ret.props.content = edited;
                    if (ret?.props?.children?.props?.children?.props?.content) {
                        ret.props.children.props.children.props.content = edited;
                    }
                } catch {}
                return ret;
            })
        );
    }

    showToast("Local Message Editor Loaded!", 1);
};

function showEditDialog(message: any) {
    const current = storage.editedMessages[message.id] ?? message.content ?? "";

    RN.Alert.prompt(
        "Edit Message (Local Only)",
        "Only you see this • gone on restart",
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Save",
                onPress: (text) => {
                    const trimmed = text?.trim();
                    if (!trimmed) {
                        delete storage.editedMessages[message.id];
                        showToast("Edit removed", 0);
                    } else {
                        storage.editedMessages[message.id] = trimmed;
                        showToast("Saved locally", 1);
                    }

                    setTimeout(() => {
                        MessageStore._actionHandler?.MESSAGE_CREATE?.({
                            channelId: message.channel_id,
                            message: { ...message, content: message.content + " " },
                            optimistic: true
                        });
                    }, 50);
                }
            }
        ],
        "plain-text",
        current
    );
}

export function Settings() {
    const count = Object.keys(storage.editedMessages || {}).length;

    return (
        <RN.ScrollView style={{ flex: 1, padding: 16 }}>
            <RN.View style={{ backgroundColor: "#2b2d31", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <RN.Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
                    Local Message Editor
                </RN.Text>
                <RN.Text style={{ color: "#b5bac1", marginTop: 8 }}>
                    {count === 0 ? "No edits yet" : `Edited ${count} message(s) locally`}
                </RN.Text>
            </RN.View>

            {count > 0 && (
                <RN.TouchableOpacity
                    onPress={() => {
                        storage.editedMessages = {};
                        showToast("All edits cleared", 1);
                    }}
                    style={{ backgroundColor: "#f04747", padding: 16, borderRadius: 12, alignItems: "center" }}
                >
                    <RN.Text style={{ color: "white", fontWeight: "600" }}>Clear All Local Edits</RN.Text>
                </RN.TouchableOpacity>
            )}
        </RN.ScrollView>
    );
}

export const onUnload = () => patches.forEach(p => p?.());
export const settings = Settings;
