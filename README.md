<p align="center">
  <img src="./art/nhif-logo.svg" width="320" alt="NHIF Tanzania API Client">
</p>

# NHIF Tanzania API Client

TypeScript client for NHIF Tanzania member verification, NIDA lookup, and authorization number flow for HMIS and clinic systems.

This repo is for connecting an HMIS, clinic system, or hospital app to the current NHIF Tanzania verification flow.

It handles the parts most systems need every day: login to NHIF, checking a member by NIDA or NHIF card number, resolving the real card number, and getting the visit authorization number.

The authorization number is important because it is the approval/reference NHIF gives for that patient visit. In a clinic workflow it should move with the patient through reception, doctor, lab, pharmacy, cashier, and claims. Without it, the visit can be hard to claim, audit, or prove later.

## What it uses

- TypeScript
- Node.js 18+ fetch
- No runtime dependencies
- Works well in Next.js API routes, server actions, Express, or any Node backend

## Why this exists

Some older NHIF examples use old token and verification endpoints. The current Service Portal flow uses:

- `externalouth/connect/token` for login
- `AuthorizationService/api/Verification/GetCardDetailsExt` for member lookup
- `AuthorizationService/api/Verification/AuthorizeCard` for the authorization number

This package keeps that flow in one clean place so your main app code stays simple.

## Install

From npm, once published:

```bash
npm install nhif-tanzania-api-client
```

From GitHub:

```bash
npm install github:your-name/nhif-tanzania-api-client
```

## Environment

Create a `.env` file in your app. Do not commit it.

```env
NHIF_USERNAME=
NHIF_PASSWORD=
NHIF_MODE=production

NHIF_TOKEN_URL=https://verification.nhif.or.tz/externalouth/connect/token
NHIF_AUTHORIZATION_BASE_URL=https://verification.nhif.or.tz/AuthorizationService/
NHIF_CLIENT_ID=
NHIF_CLIENT_SECRET=
NHIF_SCOPE=MedicalService

NHIF_VISIT_TYPE_ID=1
NHIF_ENFORCE_ONLINE_FORM=true
NHIF_METHOD_USED=Online
NHIF_BIOMETRIC_METHOD=None
NHIF_NARRATION=undefined
```

Only put real username and password on your server. This repo has `.env.example` only. If NHIF gives you a different client id or client secret, put them in your server `.env`. Otherwise the package uses the current Service Portal defaults.

## Usage

Authorize by NIDA:

```ts
import { createNhifClientFromEnv } from "nhif-tanzania-api-client";

const nhif = createNhifClientFromEnv(process.env);

const result = await nhif.authorizeMember("19900101000000000000", {
  identifierType: "NationalID",
});

if (result.ok) {
  console.log(result.authorizationNumber);
}
```

Authorize by NHIF card number:

```ts
const result = await nhif.authorizeMember("100000000000", {
  identifierType: "CardNo",
});
```

Check member details only:

```ts
const member = await nhif.getCardDetails("19900101000000000000", "NationalID");

console.log(member.FullName, member.CardStatus, member.CardNo);
```

## Next.js example

```ts
import { NextResponse } from "next/server";
import { createNhifClientFromEnv } from "nhif-tanzania-api-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier") || "";
  const identifierType = searchParams.get("identifierType") === "CardNo" ? "CardNo" : "NationalID";

  const nhif = createNhifClientFromEnv(process.env);
  const result = await nhif.authorizeMember(identifier, { identifierType });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
```

## Files

- `src/client.ts` has the NHIF login, lookup, and authorization calls
- `src/types.ts` has the response and option types
- `examples/next-app-router/route.ts` shows how to use it in Next.js
- `.env.example` shows the server variables without exposing credentials

## Notes

- Use `NationalID` when the user enters NIDA.
- Use `CardNo` when the user enters an NHIF card number.
- For NIDA, the client first asks NHIF for the member details, then uses the returned `CardNo` to request authorization.
- Store `AuthorizationNo` in your patient visit, invoice, lab, pharmacy, and claim records where your system needs it.
- Never log the NHIF password or bearer token.

## Credit

This was inspired by the existing Laravel NHIF community work and the NHIF Service Portal flow. This package is TypeScript-first and made for current Node and Next.js systems.

## License

MIT
