// Imported once (for side effects) from app.ts so every payment provider is
// registered before any request can arrive. Same convention as
// settlement-handlers/index.ts.
import "./orange-money.provider";
import "./mtn-momo.provider";
