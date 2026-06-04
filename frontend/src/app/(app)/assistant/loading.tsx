import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-cream-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-20 w-3/4 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-14 w-1/2 rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-28 w-3/4 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="mt-12">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="grid sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-cream-200 px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-2">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </div>
  );
}
