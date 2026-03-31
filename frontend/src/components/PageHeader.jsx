export default function PageHeader({ kicker, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3 min-w-0">
        {kicker ? <span className="th-kicker">{kicker}</span> : null}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
