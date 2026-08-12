import { describe, expect, it } from "vitest";
import {
  isDisposableEmail,
  validateEmailForSignup,
} from "../src/lib/email-policy";
import { getInitials, userProfile } from "../src/lib/user-profile";

describe("validateEmailForSignup", () => {
  it("accepts popular provider emails", () => {
    expect(validateEmailForSignup("priya@gmail.com")).toEqual({ ok: true });
    expect(validateEmailForSignup("rahul@outlook.com")).toEqual({ ok: true });
    expect(validateEmailForSignup("akash@yahoo.co.in")).toEqual({ ok: true });
    expect(validateEmailForSignup("user@hotmail.com")).toEqual({ ok: true });
    expect(validateEmailForSignup("a@icloud.com")).toEqual({ ok: true });
    expect(validateEmailForSignup("b@proton.me")).toEqual({ ok: true });
    expect(validateEmailForSignup("x@aol.com")).toEqual({ ok: true });
  });

  it("accepts personal/custom domain emails", () => {
    expect(validateEmailForSignup("me@mycompany.co.in")).toEqual({ ok: true });
    expect(validateEmailForSignup("student@university.edu")).toEqual({ ok: true });
  });

  it("rejects malformed emails", () => {
    expect(validateEmailForSignup("not-an-email")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("a@b")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("a b@c.com")).toMatchObject({ ok: false });
  });

  it("rejects known disposable email domains", () => {
    expect(validateEmailForSignup("spam@mailinator.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@yopmail.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@10minutemail.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@temp-mail.org")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@guerrillamail.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@trashmail.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@throwawaymail.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@dispostable.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@maildrop.cc")).toMatchObject({ ok: false });
  });

  it("rejects freshly reported disposable domains", () => {
    expect(validateEmailForSignup("takomed603@mrworlds.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@mrworlds.top")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@mrworlds.xyz")).toMatchObject({ ok: false });
  });

  it("rejects variant domains of known disposable services", () => {
    expect(validateEmailForSignup("x@foo.mailinator.com")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@bar.yopmail.fr")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("x@tempmail.example")).toBeTruthy();
    expect(isDisposableEmail("x@totallytempmail.example")).toBe(true);
    expect(isDisposableEmail("x@temp-mail-box.de")).toBe(true);
    expect(isDisposableEmail("x@mohmal.tech")).toBe(true);
    expect(isDisposableEmail("x@spamgourmet.com")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(validateEmailForSignup("  Spam@Mailinator.com  ")).toMatchObject({ ok: false });
    expect(validateEmailForSignup("  Priya@Gmail.COM ")).toEqual({ ok: true });
  });
});

describe("isDisposableEmail", () => {
  it("flags disposable and subdomains of disposable roots", () => {
    expect(isDisposableEmail("a@yopmail.com")).toBe(true);
    expect(isDisposableEmail("a@mailinator.com")).toBe(true);
    expect(isDisposableEmail("a@gmail.com")).toBe(false);
    expect(isDisposableEmail("a@outlook.com")).toBe(false);
    expect(isDisposableEmail("a@mrworlds.com")).toBe(true);
  });

  it("never flags popular providers or plausible custom domains", () => {
    const clean = [
      "a@gmail.com",
      "a@outlook.com",
      "a@hotmail.com",
      "a@yahoo.co.in",
      "a@icloud.com",
      "a@proton.me",
      "a@aol.com",
      "me@mycompany.co.in",
      "student@university.edu",
      "a@temperaturesensor.io",
      "a@spamfiltering.co",
    ];
    clean.forEach((email) => expect(isDisposableEmail(email)).toBe(false));
  });
});

describe("getInitials", () => {
  it("uses first letters of name words", () => {
    expect(getInitials("Priya Sharma", "priya@gmail.com")).toBe("PS");
    expect(getInitials("Rahul", "rahul@outlook.com")).toBe("R");
  });

  it("falls back to email local part", () => {
    expect(getInitials("", "priya.sharma@gmail.com")).toBe("PS");
    expect(getInitials("", "rahul@outlook.com")).toBe("R");
    expect(getInitials("", "a@b.com")).toBe("A");
  });

  it("falls back to a placeholder when nothing is available", () => {
    expect(getInitials("", "")).toBe("?");
  });
});

describe("userProfile", () => {
  const baseUser = {
    id: "u1",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    created_at: "",
    updated_at: "",
    is_anonymous: false,
  } as const;

  it("prefers Google full_name and avatar_url metadata", () => {
    const profile = userProfile({
      ...baseUser,
      email: "priya@gmail.com",
      user_metadata: { full_name: "Priya Sharma", avatar_url: "https://lh3.google.com/abc" },
    });
    expect(profile).toMatchObject({
      name: "Priya Sharma",
      email: "priya@gmail.com",
      avatarUrl: "https://lh3.google.com/abc",
      initials: "PS",
    });
  });

  it("derives initials from the email when there is no name", () => {
    const profile = userProfile({
      ...baseUser,
      email: "rahul.kumar@outlook.com",
      user_metadata: {},
    });
    expect(profile.name).toBe("");
    expect(profile.avatarUrl).toBeNull();
    expect(profile.initials).toBe("RK");
  });
});
