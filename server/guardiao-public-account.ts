/** Contrato público da conta local: nunca incluir hash de senha, tokens ou registros de sessão. */
type PublicAccountSource = {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdDate?: string;
  updatedDate?: string;
};

export function toPublicGuardiaoAccount(account: PublicAccountSource) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    emailVerified: account.emailVerifiedAt !== null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    // MySQL DATE_FORMAT preserva o dia civil do registro, inclusive perto da meia-noite.
    createdDate: account.createdDate ?? account.createdAt.toISOString().slice(0, 10),
    updatedDate: account.updatedDate ?? account.updatedAt.toISOString().slice(0, 10),
  };
}
