import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { ToastProvider, useToast } from "./ToastContext";
import { FLASH_TOAST_STORAGE_KEY, writeFlashToast } from "@/app/lib/toast/flashToast";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({
      children,
      layout,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileHover,
      whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => <button {...props}>{children}</button>,
  },
}));

function TestConsumer() {
  const { queueFlashToast } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        queueFlashToast("Email verified. Account secured.", "sage", 3000, {
          targetPath: "/profile",
          onceKey: "email-verified-redirect-success",
        })
      }
    >
      Queue Flash Toast
    </button>
  );
}

describe("ToastProvider flash toasts", () => {
  const mockUsePathname = usePathname as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.sessionStorage.clear();
    mockUsePathname.mockReturnValue("/");
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("shows a queued flash toast when the pathname matches the target path", async () => {
    const { rerender } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Queue Flash Toast" }));

    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).not.toBeNull();

    mockUsePathname.mockReturnValue("/profile");
    rerender(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(await screen.findByText("Email verified. Account secured.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });

  it("does not show a queued flash toast on a non-matching pathname", () => {
    const { rerender } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Queue Flash Toast" }));

    mockUsePathname.mockReturnValue("/interests");
    rerender(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(screen.queryByText("Email verified. Account secured.")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).not.toBeNull();
  });

  it("clears a flash toast after it is shown", async () => {
    writeFlashToast({
      message: "Email verified. Account secured.",
      type: "sage",
      duration: 3000,
      targetPath: "/profile",
      expiresAt: Date.now() + 60_000,
    });

    mockUsePathname.mockReturnValue("/profile");

    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    expect(await screen.findByText("Email verified. Account secured.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });

  it("shows a once-keyed flash toast only once across pathname repeats", async () => {
    const { rerender } = render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    writeFlashToast({
      message: "Email verified. Account secured.",
      type: "sage",
      duration: 3000,
      targetPath: "/profile",
      onceKey: "email-verified-redirect-success",
      expiresAt: Date.now() + 60_000,
    });

    mockUsePathname.mockReturnValue("/profile");
    rerender(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    expect(await screen.findByText("Email verified. Account secured.")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText("Email verified. Account secured.")).not.toBeInTheDocument();
    });

    writeFlashToast({
      message: "Email verified. Account secured.",
      type: "sage",
      duration: 3000,
      targetPath: "/profile",
      onceKey: "email-verified-redirect-success",
      expiresAt: Date.now() + 60_000,
    });

    mockUsePathname.mockReturnValue("/home");
    rerender(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    mockUsePathname.mockReturnValue("/profile");
    rerender(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    expect(screen.queryByText("Email verified. Account secured.")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });

  it("drops expired payloads without rendering a toast", () => {
    writeFlashToast({
      message: "Email verified. Account secured.",
      type: "sage",
      duration: 3000,
      targetPath: "/profile",
      expiresAt: Date.now() - 1,
    });

    mockUsePathname.mockReturnValue("/profile");

    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    expect(screen.queryByText("Email verified. Account secured.")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });
});
