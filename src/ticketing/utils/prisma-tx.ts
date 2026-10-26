import prismaDb from "../../config/prismaClient";

/**
 * Client reçu dans `prismaDb.$transaction(async (tx) => …)`. Le client de
 * l'app est étendu (timezoneCompatExtension), son type de transaction n'est
 * donc pas `Prisma.TransactionClient` : on le dérive du client réel.
 */
export type PrismaTx = Omit<typeof prismaDb, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
