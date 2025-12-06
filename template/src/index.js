export default {
    name: "Local Message Editor",
    description: "Locally edits the text of any Discord message.",
    authors: [{ name: "You" }],
    version: "1.0.0",

    storage: {
        edits: {}
    },

    start() {
        console.log("[LocalMessageEditor] Loaded");

        // Observe DOM changes to patch newly rendered messages
        this.mutationObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    this.processNode(node);
                }
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Add right-click menu entry
        document.addEventListener(
            "contextmenu",
            (this.onContextMenu = (e) => {
                const msgEl = e.target.closest("[id^='chat-messages-']");
                if (!msgEl) return;

                this.lastMessageElement = msgEl;

                // Wait for Discord's menu to appear
                setTimeout(() => this.injectEditOption(), 50);
            })
        );
    },

    stop() {
        this.mutationObserver?.disconnect();
        document.removeEventListener("contextmenu", this.onContextMenu);
    },

    // -------------------------------------------------------------
    // Inject our custom menu button
    // -------------------------------------------------------------
    injectEditOption() {
        const menu = document.querySelector("[role='menu']");
        if (!menu) return;

        // Create menu item styled like Discord's
        const menuItem = document.createElement("div");
        menuItem.setAttribute("role", "menuitem");
        menuItem.className = menu.children[0]?.className || "";
        menuItem.textContent = "Edit User Text (Local Only)";

        menuItem.onclick = () => this.openEditor();

        menu.appendChild(menuItem);
    },

    // -------------------------------------------------------------
    // Simple editor using prompt() — works everywhere
    // -------------------------------------------------------------
    openEditor() {
        const msgId = this.getMessageId(this.lastMessageElement);
        if (!msgId) return;

        const original = this.getOriginalMessageText(msgId);
        const local = this.storage.edits[msgId] ?? original;

        const edited = prompt("Edit message text (local only):", local);
        if (edited === null) return;

        if (edited.trim() === original.trim()) {
            delete this.storage.edits[msgId];
        } else {
            this.storage.edits[msgId] = edited;
        }

        this.refresh(msgId);
    },

    // -------------------------------------------------------------
    // Extract message ID from DOM ID
    // -------------------------------------------------------------
    getMessageId(el) {
        return (el?.id ?? "").replace("chat-messages-", "");
    },

    // -------------------------------------------------------------
    // Read original message text from DOM
    // -------------------------------------------------------------
    getOriginalMessageText(msgId) {
        const el = document.getElementById("chat-messages-" + msgId);
        return el?.querySelector("[data-message-content]")?.textContent ?? "";
    },

    // -------------------------------------------------------------
    // Refresh message visually so patched text appears immediately
    // -------------------------------------------------------------
    refresh(msgId) {
        const el = document.getElementById("chat-messages-" + msgId);
        if (!el) return;

        el.style.opacity = "0.01";
        setTimeout(() => {
            el.style.opacity = "";
            this.patchMessage(el);
        }, 30);
    },

    // -------------------------------------------------------------
    // Process new DOM nodes to patch messages
    // -------------------------------------------------------------
    processNode(node) {
        if (!(node instanceof HTMLElement)) return;

        const msgs = node.querySelectorAll?.("[id^='chat-messages-']") ?? [];
        msgs.forEach(m => this.patchMessage(m));
    },

    // -------------------------------------------------------------
    // Replace the displayed message text
    // -------------------------------------------------------------
    patchMessage(el) {
        const msgId = this.getMessageId(el);
        if (!msgId) return;

        const newText = this.storage.edits[msgId];
        if (!newText) return;

        const content = el.querySelector("[data-message-content]");
        if (!content) return;

        content.textContent = newText;
    }
};
