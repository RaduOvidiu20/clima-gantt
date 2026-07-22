export function SetupNotice({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
      <h2 className="mb-2 text-base font-semibold">
        Baza de date nu este încă configurată
      </h2>
      <p className="mb-3">
        Pentru a porni aplicația, completează parola Supabase în fișierul{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code> (înlocuiește{" "}
        <code className="rounded bg-amber-100 px-1">[YOUR-PASSWORD]</code>) și apoi
        rulează:
      </p>
      <pre className="mb-3 overflow-x-auto rounded bg-amber-100 p-3 text-xs">
        npm run db:push{"\n"}npm run dev
      </pre>
      <p>
        Connection string-ul (pooler 6543 + direct 5432) este deja pregătit în{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code>.
      </p>
      {detail ? (
        <p className="mt-3 rounded bg-amber-100 p-2 font-mono text-xs break-all">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
