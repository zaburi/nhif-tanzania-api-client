export type NhifIdentifierType = "NationalID" | "CardNo";

export type NhifEnv = Record<string, string | undefined>;

export type NhifClientOptions = {
  username: string;
  password: string;
  tokenUrl?: string;
  authorizationBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  defaultVisitTypeId?: number;
  enforceOnlineForm?: boolean;
  methodUsed?: string;
  biometricMethod?: string;
  narration?: string;
  fetch?: typeof fetch;
};

export type NhifAuthorizeOptions = {
  identifierType?: NhifIdentifierType;
  visitTypeId?: number;
  referralNumber?: string;
  enforceOnlineForm?: boolean;
  narration?: string;
  methodUsed?: string;
  biometricMethod?: string;
  resolveCard?: boolean;
};

export type NhifTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
};

export type NhifCardDetails = {
  CardNo?: string;
  MembershipNo?: string;
  EmployerNo?: string;
  EmployerName?: string;
  SchemeID?: number;
  SchemeName?: string;
  CardStatus?: string;
  StatusDescription?: string;
  IsValidCard?: boolean | number;
  IsActive?: boolean | number;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  FullName?: string;
  Gender?: string;
  DateOfBirth?: string;
  Age?: string | number;
  CHNationalID?: string;
  NationalID?: string;
  AuthorizationStatus?: string;
  AuthorizationNo?: string;
  Remarks?: string;
  ProductName?: string;
  ProductCode?: string;
  [key: string]: unknown;
};

export type NhifAuthorizeResult =
  | {
      ok: true;
      authorizationNumber: string;
      cardNumber: string;
      identifierType: NhifIdentifierType;
      data: NhifCardDetails;
    }
  | {
      ok: false;
      error: string;
      cardNumber?: string;
      identifierType: NhifIdentifierType;
      data?: NhifCardDetails;
    };

export type NhifClient = {
  authenticate(): Promise<string>;
  getCardDetails(identifier: string, identifierType?: NhifIdentifierType): Promise<NhifCardDetails>;
  verifyMember(identifier: string, identifierType?: NhifIdentifierType): Promise<NhifCardDetails>;
  authorizeMember(identifier: string, options?: NhifAuthorizeOptions): Promise<NhifAuthorizeResult>;
};
