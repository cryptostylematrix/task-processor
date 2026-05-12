import dotenv from "dotenv";
dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });

// app settings
export const appConfig = {
  port: Number(process.env.PORT || 3001),

};

const defaultMatrixApiHost = "https://cs.apihub160.cc";
//const defaultMatrixApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultMatrixApiHost;
const defaultMarketingApiHost = defaultMatrixApiHost;
const defaultNeoMarketingAddr = "EQAc4cKpE4yQpsadUsem6r30HHjjrmmtT13pPsRpvtLSEUHi";

export const apiConfig = {
  matrixApi: {
    host: (process.env.MATRIX_API_HOST as string | undefined) ?? defaultMatrixApiHost,
    defaultApiHost: defaultMatrixApiHost,
  },
  contractsApi: {
    host: (process.env.CONTRACTS_API_HOST as string | undefined) ?? defaultContractsApiHost,
    defaultApiHost: defaultContractsApiHost,
  },
  marketingApi: {
    host: (process.env.MARKETING_API_HOST as string | undefined) ?? defaultMarketingApiHost,
    defaultApiHost: defaultMarketingApiHost,
  },
  neo: {
    marketingAddr: (process.env.NEO_MARKETING_ADDR as string | undefined) ?? defaultNeoMarketingAddr,
  },
} as const;

// database settings 
export const dbConfig = {
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "cs_user",
  password: process.env.PGPASSWORD || "password",
  database: process.env.PGDATABASE || "cs",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
};

// blockchain settings
export const tonConfig = {
  marketingQueueAddress: process.env.MARKETING_QUEUE_ADDRESS ?? "",
  processorMnemonic: process.env.PROCESSOR_MNEMONIC ?? "",
  tonCenterEndpoint: process.env.TONCENTER_ENDPOINT ?? "https://toncenter.com/api/v2/jsonRPC",
  tonCenterApiKey: process.env.TONCENTER_API_KEY ?? "",
};

// seq logging settings
export const seqConfig = {
  url: process.env.SEQ_URL || "http://localhost:5341",
  apiKey: process.env.SEQ_API_KEY || undefined,
};
