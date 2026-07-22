<p align="center">
  <img src="./art/nhif-logo.png" width="320" alt="NHIF Tanzania API Client">
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

const result = await nhif.authorizeMember("NIDA_NUMBER_HERE", {
  identifierType: "NationalID",
});

if (result.ok) {
  console.log(result.authorizationNumber);
}
```

Authorize by NHIF card number:

```ts
const result = await nhif.authorizeMember("NHIF_CARD_NUMBER_HERE", {
  identifierType: "CardNo",
});
```

Check member details only:

```ts
const member = await nhif.getCardDetails("NIDA_NUMBER_HERE", "NationalID");

console.log(member.FullName, member.CardStatus, member.CardNo);
```

## Response examples

These examples are not real patient data. They only show the shape of the response you can expect.

Successful authorization:

```json
{
  "ok": true,
  "authorizationNumber": "AUTHORIZATION_NUMBER_FROM_NHIF",
  "cardNumber": "NHIF_CARD_NUMBER_FROM_NHIF",
  "identifierType": "NationalID",
  "data": {
    "AuthorizationStatus": "ACCEPTED",
    "AuthorizationNo": "AUTHORIZATION_NUMBER_FROM_NHIF",
    "Remarks": "Verified OK",
    "CardNo": "NHIF_CARD_NUMBER_FROM_NHIF",
    "MembershipNo": "MEMBERSHIP_NUMBER_FROM_NHIF",
    "FullName": "Example Patient",
    "FirstName": "Example",
    "MiddleName": "Middle",
    "LastName": "Patient",
    "Gender": "Male",
    "DateOfBirth": "1990-01-01",
    "CardStatus": "Active",
    "IsValidCard": true,
    "IsActive": true,
    "ProductName": "Example NHIF benefit scheme"
  }
}
```

Member details lookup:

```json
{
  "CardNo": "NHIF_CARD_NUMBER_FROM_NHIF",
  "MembershipNo": "MEMBERSHIP_NUMBER_FROM_NHIF",
  "FullName": "Example Patient",
  "Gender": "Female",
  "DateOfBirth": "1995-05-20",
  "Age": 31,
  "NationalID": "NIDA_NUMBER_FROM_NHIF",
  "CardStatus": "Active",
  "StatusDescription": "Active",
  "IsValidCard": 1,
  "IsActive": 1,
  "AuthorizationStatus": "N/A",
  "AuthorizationNo": "N/A",
  "Remarks": "N/A"
}
```

Rejected authorization:

```json
{
  "ok": false,
  "cardNumber": "NHIF_CARD_NUMBER_FROM_NHIF",
  "identifierType": "CardNo",
  "error": "NHIF did not accept this authorization request.",
  "data": {
    "AuthorizationStatus": "REJECTED",
    "AuthorizationNo": "N/A",
    "Remarks": "Example rejection reason from NHIF",
    "CardNo": "NHIF_CARD_NUMBER_FROM_NHIF",
    "FullName": "Example Patient"
  }
}
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
