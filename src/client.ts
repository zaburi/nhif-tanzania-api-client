import type {
  NhifAuthorizeOptions,
  NhifAuthorizeResult,
  NhifCardDetails,
  NhifClient,
  NhifClientOptions,
  NhifEnv,
  NhifIdentifierType,
  NhifTokenResponse,
} from "./types.js";

const DEFAULTS = {
  tokenUrl: "https://verification.nhif.or.tz/externalouth/connect/token",
  authorizationBaseUrl: "https://verification.nhif.or.tz/AuthorizationService/",
  clientId: "serviceportal",
  clientSecret: "serviceportal",
  scope: "MedicalService",
  visitTypeId: 1,
  enforceOnlineForm: true,
  methodUsed: "Online",
  biometricMethod: "None",
  narration: "undefined",
};

export function createNhifClientFromEnv(env: NhifEnv): NhifClient {
  return createNhifClient({
    username: requiredEnv(env, "NHIF_USERNAME"),
    password: requiredEnv(env, "NHIF_PASSWORD"),
    tokenUrl: env.NHIF_TOKEN_URL || DEFAULTS.tokenUrl,
    authorizationBaseUrl: env.NHIF_AUTHORIZATION_BASE_URL || DEFAULTS.authorizationBaseUrl,
    clientId: env.NHIF_CLIENT_ID || DEFAULTS.clientId,
    clientSecret: env.NHIF_CLIENT_SECRET || DEFAULTS.clientSecret,
    scope: env.NHIF_SCOPE || DEFAULTS.scope,
    defaultVisitTypeId: numberEnv(env.NHIF_VISIT_TYPE_ID, DEFAULTS.visitTypeId),
    enforceOnlineForm: booleanEnv(env.NHIF_ENFORCE_ONLINE_FORM, DEFAULTS.enforceOnlineForm),
    methodUsed: env.NHIF_METHOD_USED || DEFAULTS.methodUsed,
    biometricMethod: env.NHIF_BIOMETRIC_METHOD || DEFAULTS.biometricMethod,
    narration: env.NHIF_NARRATION || DEFAULTS.narration,
  });
}

export function createNhifClient(options: NhifClientOptions): NhifClient {
  const fetcher = options.fetch ?? globalThis.fetch;

  if (!fetcher) {
    throw new Error("NHIF client needs fetch. Use Node 18+ or pass a fetch implementation.");
  }

  const username = clean(options.username);
  const password = clean(options.password);

  if (!username || !password) {
    throw new Error("NHIF username and password are required.");
  }

  const tokenUrl = options.tokenUrl || DEFAULTS.tokenUrl;
  const authorizationBaseUrl = withSlash(options.authorizationBaseUrl || DEFAULTS.authorizationBaseUrl);

  async function authenticate(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "password",
      username,
      password,
      client_id: options.clientId || DEFAULTS.clientId,
      client_secret: options.clientSecret || DEFAULTS.clientSecret,
      scope: options.scope || DEFAULTS.scope,
    });

    const response = await fetcher(tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await readJson<NhifTokenResponse>(response);

    if (!response.ok) {
      throw new Error(`NHIF login failed: ${messageFrom(data) || response.statusText}`);
    }

    if (!data.access_token) {
      throw new Error("NHIF login worked, but no access token was returned.");
    }

    return data.access_token;
  }

  async function getCardDetails(
    identifier: string,
    identifierType: NhifIdentifierType = guessIdentifierType(identifier),
  ): Promise<NhifCardDetails> {
    const token = await authenticate();
    return getCardDetailsWithToken(identifier, identifierType, token);
  }

  async function getCardDetailsWithToken(
    identifier: string,
    identifierType: NhifIdentifierType,
    token: string,
  ): Promise<NhifCardDetails> {
    return callAuthorization<NhifCardDetails>(
      "api/Verification/GetCardDetailsExt",
      {
        CardNo: clean(identifier),
        CardType: identifierType,
      },
      token,
    );
  }

  async function authorizeMember(
    identifier: string,
    authorizeOptions: NhifAuthorizeOptions = {},
  ): Promise<NhifAuthorizeResult> {
    const identifierType = authorizeOptions.identifierType ?? guessIdentifierType(identifier);
    const token = await authenticate();
    let cardNumber = clean(identifier);
    let details: NhifCardDetails | undefined;

    if (authorizeOptions.resolveCard !== false || identifierType === "NationalID") {
      details = await getCardDetailsWithToken(identifier, identifierType, token);
      cardNumber = clean(details.CardNo || cardNumber);
    }

    if (!cardNumber) {
      return {
        ok: false,
        identifierType,
        data: details,
        error: "NHIF did not return a card number for this member.",
      };
    }

    const data = await callAuthorization<NhifCardDetails>(
      "api/Verification/AuthorizeCard",
      {
        CardNo: cardNumber,
        VisitTypeID: authorizeOptions.visitTypeId ?? options.defaultVisitTypeId ?? DEFAULTS.visitTypeId,
        ReferralNo: authorizeOptions.referralNumber ?? "",
        EnforceOnlineForm: authorizeOptions.enforceOnlineForm ?? options.enforceOnlineForm ?? DEFAULTS.enforceOnlineForm,
        Narration: authorizeOptions.narration ?? options.narration ?? DEFAULTS.narration,
        MethodUsed: authorizeOptions.methodUsed ?? options.methodUsed ?? DEFAULTS.methodUsed,
        BiometricMethod: authorizeOptions.biometricMethod ?? options.biometricMethod ?? DEFAULTS.biometricMethod,
      },
      token,
    );

    const authorizationNumber = clean(data.AuthorizationNo);
    const status = clean(data.AuthorizationStatus).toUpperCase();

    if (status === "ACCEPTED" && authorizationNumber && authorizationNumber !== "N/A") {
      return { ok: true, authorizationNumber, cardNumber, identifierType, data };
    }

    return {
      ok: false,
      cardNumber,
      identifierType,
      data,
      error: clean(data.Remarks) || clean(data.StatusDescription) || "NHIF did not accept this authorization request.",
    };
  }

  async function callAuthorization<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
    token: string,
  ): Promise<T> {
    const url = new URL(path, authorizationBaseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    const data = await readJson<T>(response);

    if (!response.ok) {
      throw new Error(`NHIF request failed: ${messageFrom(data) || response.statusText}`);
    }

    return data;
  }

  return {
    authenticate,
    getCardDetails,
    verifyMember: getCardDetails,
    authorizeMember,
  };
}

export function guessIdentifierType(identifier: string): NhifIdentifierType {
  return /^\d{20}$/.test(clean(identifier)) ? "NationalID" : "CardNo";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

function messageFrom(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  return clean(record.error_description) || clean(record.error) || clean(record.Message) || clean(record.message);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function withSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function requiredEnv(env: NhifEnv, key: string): string {
  const value = clean(env[key]);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}
