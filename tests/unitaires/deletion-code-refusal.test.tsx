import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const actions = vi.hoisted(() => ({
  requestBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/actions/branch/request-branch-deletion", () => ({
  handleRequestBranchDeletion: actions.requestBranch,
}));
vi.mock("@/actions/branch/delete-branch", () => ({
  handleDeleteBranch: actions.deleteBranch,
}));
vi.mock("@/features/branch/lib/after-write", () => ({
  refreshAfterBranchWrite: vi.fn(async () => undefined),
}));
vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: vi.fn(async () => undefined),
}));

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { resendCooldownAfterRefusal } from "@/lib/api-error";
import { DeleteBranchDialog } from "@/features/branch/delete-dialog";
import type { BranchRow } from "@/features/branch/lib/server-table";
import { useDeleteBusinessForm } from "@/app/(protected)/_components/admin/business/delete-business-form/hooks";
import type { DeleteBusinessFormState } from "@/app/(protected)/_components/admin/business/delete-business-form/delete-business-form.types";

/**
 * 409 *_DELETION_NOT_REQUESTED and *_DELETION_CODE_EXPIRED: the code on
 * screen can no longer work. The dialogs free "Reenviar código" at once
 * instead of leaving the person to wait out the 60 s cooldown retyping it.
 */

describe("resendCooldownAfterRefusal", () => {
  it("frees the resend at once when the refusal needs a new code", () => {
    expect(resendCooldownAfterRefusal({ requestNewCode: true }, 47)).toBe(0);
  });

  it("keeps the running cooldown for a wrong code (the code is still valid)", () => {
    expect(resendCooldownAfterRefusal({}, 47)).toBe(47);
    expect(resendCooldownAfterRefusal({ requestNewCode: false }, 12)).toBe(12);
  });
});

let host: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  actions.requestBranch.mockReset();
  actions.deleteBranch.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

/** Sets a React-controlled input's value the way typing does. */
function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function button(label: RegExp): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((element) => label.test(element.textContent ?? ""));

  if (!found) throw new Error(`botão ${label} não encontrado`);

  return found;
}

const BRANCH = {
  id: "branch-1",
  businessId: "business-1",
  corporate_reason: "Filial Centro",
} as BranchRow;

describe("DeleteBranchDialog", () => {
  async function reachCodeStep(): Promise<void> {
    actions.requestBranch.mockResolvedValue({
      successMessage: "Código enviado.",
    });

    await act(async () => {
      root.render(
        <DeleteBranchDialog branch={BRANCH} isOpen onClose={() => undefined} />,
      );
    });

    await act(async () => {
      type(
        document.getElementById("confirm-branch-name") as HTMLInputElement,
        "Filial Centro",
      );
    });
    await act(async () => {
      button(/Enviar código/).click();
    });

    expect(button(/Reenviar código \(\d+s\)/).disabled).toBe(true);

    await act(async () => {
      type(
        document.querySelector<HTMLInputElement>(
          'input[autocomplete="one-time-code"], input[data-input-otp]',
        )!,
        "123456",
      );
    });
  }

  it("frees 'Reenviar código' when the API says nothing was requested", async () => {
    await reachCodeStep();
    actions.deleteBranch.mockResolvedValue({
      deleteBranchError:
        "Não há solicitação de exclusão pendente. Solicite a exclusão novamente.",
      errorCode: "BRANCH_DELETION_NOT_REQUESTED",
      requestNewCode: true,
    });

    await act(async () => {
      button(/Excluir Filial/).click();
    });

    const resend = button(/Reenviar código/);

    expect(resend.textContent).toBe("Reenviar código");
    expect(resend.disabled).toBe(false);
  });

  it("keeps the cooldown after a wrong code", async () => {
    await reachCodeStep();
    actions.deleteBranch.mockResolvedValue({
      deleteBranchError: "Código inválido.",
      errorCode: "BRANCH_DELETION_CODE_INVALID",
    });

    await act(async () => {
      button(/Excluir Filial/).click();
    });

    expect(button(/Reenviar código \(\d+s\)/).disabled).toBe(true);
  });
});

describe("useDeleteBusinessForm", () => {
  const seen: { resendTimer: number; otpCode: string }[] = [];
  let goToCodeStep: () => void = () => undefined;

  function Harness({ state }: { state: DeleteBusinessFormState | null }): null {
    const form = useDeleteBusinessForm(state);

    goToCodeStep = form.goToCodeStep;
    seen.push({ resendTimer: form.resendTimer, otpCode: form.otpCode });

    return null;
  }

  const last = () => seen[seen.length - 1];

  it("frees the resend when the code expired or was never requested", async () => {
    await act(async () => root.render(<Harness state={null} />));
    await act(async () => goToCodeStep());

    expect(last().resendTimer).toBeGreaterThan(0);

    await act(async () =>
      root.render(
        <Harness
          state={{
            deleteBusinessError:
              "O código expirou. Solicite a exclusão novamente.",
            errorCode: "BUSINESS_DELETION_CODE_EXPIRED",
            requestNewCode: true,
          }}
        />,
      ),
    );

    expect(last().resendTimer).toBe(0);
  });

  it("keeps the cooldown after a wrong code", async () => {
    await act(async () => root.render(<Harness state={null} />));
    await act(async () => goToCodeStep());
    await act(async () =>
      root.render(
        <Harness
          state={{
            deleteBusinessError: "Código inválido.",
            errorCode: "BUSINESS_DELETION_CODE_INVALID",
          }}
        />,
      ),
    );

    expect(last().resendTimer).toBeGreaterThan(0);
  });
});

void React;
