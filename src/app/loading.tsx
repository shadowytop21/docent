export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-full bg-[rgba(79,70,229,0.12)]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-[2rem] bg-[rgba(79,70,229,0.08)]" />
          <div className="h-72 animate-pulse rounded-[2rem] bg-[rgba(27,43,75,0.06)]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-[1.75rem] bg-white/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
