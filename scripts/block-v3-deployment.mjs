const PROTECTED_V3_PROJECT_ID = "prj_ZikcKshQBXboeaB4NnYdDaAAorXD";

const targetProjectId = process.env.VERCEL_PROJECT_ID;

if (targetProjectId === PROTECTED_V3_PROJECT_ID) {
  console.error(
    [
      "",
      "DEPLOY BLOQUEADO: este repositorio e o Aurohub legado/V2.",
      "Ele nao pode ser publicado no projeto Vercel aurohub-v3.",
      `Project ID protegido: ${PROTECTED_V3_PROJECT_ID}`,
      "Use o monorepo V3 (build em apps/web/.next) para publicar em producao.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Deployment guard: destino nao e o projeto protegido aurohub-v3.");
