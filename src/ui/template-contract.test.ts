import { describe, expect, it } from "vitest";
import { excludedTemplateFiles, v0TemplateContracts } from "./template-contract";

describe("UI template contracts", () => {
  it("assigns unique identifiers to every V0 visual zone", () => {
    const ids = v0TemplateContracts.map((contract) => contract.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not assign excluded templates to a V0 route", () => {
    const assignedTemplates = v0TemplateContracts.flatMap((contract) =>
      contract.template === null ? [] : [contract.template],
    );

    expect(
      assignedTemplates.some((template) =>
        excludedTemplateFiles.includes(
          template as (typeof excludedTemplateFiles)[number],
        ),
      ),
    ).toBe(false);
  });

  it("marks every absent visual reference explicitly", () => {
    for (const contract of v0TemplateContracts) {
      if (contract.template === null) {
        expect(contract.coverage).toBe("missing");
      }
    }
  });
});
