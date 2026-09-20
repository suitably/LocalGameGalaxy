import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { useTTS } from "./useTTS";
import { storage, STORAGE_KEYS } from "../../../lib/storage";

// Mock react-i18next
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: { language: "en" },
    }),
}));

describe("useTTS hook", () => {
    beforeEach(() => {
        storage.remove(STORAGE_KEYS.WEREWOLF_TTS_ENABLED);
    });

    afterEach(() => {
        storage.remove(STORAGE_KEYS.WEREWOLF_TTS_ENABLED);
        vi.restoreAllMocks();
    });

    it("defaults enabled state to true when no value is stored", () => {
        const TestComponent = () => {
            const { enabled } = useTTS();
            return <div data-enabled={String(enabled)} />;
        };

        const html = renderToString(<TestComponent />);
        expect(html).toContain("data-enabled=\"true\"");
    });

    it("reads false enabled state from storage key WEREWOLF_TTS_ENABLED", () => {
        storage.set(STORAGE_KEYS.WEREWOLF_TTS_ENABLED, "false");

        const TestComponent = () => {
            const { enabled } = useTTS();
            return <div data-enabled={String(enabled)} />;
        };

        const html = renderToString(<TestComponent />);
        expect(html).toContain("data-enabled=\"false\"");
    });

    it("reads true enabled state from storage key WEREWOLF_TTS_ENABLED when set to true", () => {
        storage.set(STORAGE_KEYS.WEREWOLF_TTS_ENABLED, "true");

        const TestComponent = () => {
            const { enabled } = useTTS();
            return <div data-enabled={String(enabled)} />;
        };

        const html = renderToString(<TestComponent />);
        expect(html).toContain("data-enabled=\"true\"");
    });
});
