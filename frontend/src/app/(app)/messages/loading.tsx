import { ListRowSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <aside className="w-80 border-r border-cream-200 bg-cream-50 flex flex-col">
        <div className="p-4 border-b border-cream-200">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex-1 space-y-0">
          {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </div>
      </aside>
      <main className="flex-1 flex flex-col bg-cream-50">
        <header className="px-6 py-4 border-b border-cream-200 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </header>
        <div className="flex-1 px-6 py-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-2/3 rounded-tl-sm" : "w-1/2 rounded-tr-sm"}`} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-cream-200">
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </main>
    </div>
  );
}
