import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminGate } from "./admin";

describe("AdminGate", () => {
  const sensitivePage = <div data-testid="admin-control">Revoke user access</div>;

  it("does not mount or disclose admin controls to a non-admin", () => {
    const html = renderToStaticMarkup(<AdminGate isAdmin={false}>{sensitivePage}</AdminGate>);
    expect(html).toContain("Administrator access required");
    expect(html).toContain('href="/today"');
    expect(html).not.toContain("Revoke user access");
    expect(html).not.toContain("admin-control");
  });

  it("renders the permitted admin content for a verified administrator", () => {
    const html = renderToStaticMarkup(<AdminGate isAdmin={true}>{sensitivePage}</AdminGate>);
    expect(html).toContain("Revoke user access");
    expect(html).not.toContain("Administrator access required");
  });
});
